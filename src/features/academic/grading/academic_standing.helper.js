// *************** IMPORT MODULE ***************
const AppError = require('../../../core/error');
const TestModel = require('../curriculum/curriculum.model.test');
const SubjectModel = require('../curriculum/curriculum.model.subject');
const BlockModel = require('../curriculum/curriculum.model.block');
const StudentGradeModel = require('./student_grade.model');
const AcademicStandingModel = require('./academic_standing.model');

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require('../../../core/helper_error');

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeSpawnGradeAggregator,
  ValidateAndSanitizeAggregationParams,
  ValidateAndSanitizeNormalizeStandingLabel,
  ValidateAndSanitizeEvaluateStanding,
  ValidateAndSanitizeRoundToTwoDecimals,
  ValidateAndSanitizeBuildGradeKey,
  ValidateAndSanitizeLoadCurriculumHierarchy,
} = require('./grading.validator');

// *************** GLOBAL VARIABLES ***************

/**
 * Checks if a score strictly exceeds a threshold.
 *
 * @param {Object} params - The comparison inputs.
 * @param {number} params.score - The student's numeric score.
 * @param {number} params.threshold - The grading threshold.
 * @returns {boolean} True when score > threshold.
 */
function IsGreaterThan({ score, threshold }) {
  return score > threshold;
}

/**
 * Checks if a score meets or exceeds a threshold.
 *
 * @param {Object} params - The comparison inputs.
 * @param {number} params.score - The student's numeric score.
 * @param {number} params.threshold - The grading threshold.
 * @returns {boolean} True when score >= threshold.
 */
function IsGreaterThanOrEqual({ score, threshold }) {
  return score >= threshold;
}

/**
 * Checks if a score is strictly below a threshold.
 *
 * @param {Object} params - The comparison inputs.
 * @param {number} params.score - The student's numeric score.
 * @param {number} params.threshold - The grading threshold.
 * @returns {boolean} True when score < threshold.
 */
function IsLessThan({ score, threshold }) {
  return score < threshold;
}

/**
 * Checks if a score is at or below a threshold.
 *
 * @param {Object} params - The comparison inputs.
 * @param {number} params.score - The student's numeric score.
 * @param {number} params.threshold - The grading threshold.
 * @returns {boolean} True when score <= threshold.
 */
function IsLessThanOrEqual({ score, threshold }) {
  return score <= threshold;
}

/**
 * Checks if a score equals a threshold exactly.
 *
 * @param {Object} params - The comparison inputs.
 * @param {number} params.score - The student's numeric score.
 * @param {number} params.threshold - The grading threshold.
 * @returns {boolean} True when score === threshold.
 */
function IsEqualTo({ score, threshold }) {
  return score === threshold;
}

// *************** Operator -> comparator used to resolve grading tiers
const OPERATOR_FUNCTIONS = {
  '>': IsGreaterThan,
  '>=': IsGreaterThanOrEqual,
  '<': IsLessThan,
  '<=': IsLessThanOrEqual,
  '==': IsEqualTo,
};

// *************** Statuses accepted by the AcademicStanding schema
const STANDING_STATUSES = ['PASS', 'FAIL', 'RETAKE'];

// *************** Fixed precedence: PASS beats RETAKE beats FAIL regardless of array order
const STANDING_PRECEDENCE = { FAIL: 0, RETAKE: 1, PASS: 2 };

// *************** START: Academic Standing Helper ***************

/**
 * Extracts the id from a lean curriculum document (subject or test), which
 * both expose a "_id" field.
 *
 * @param {Object} doc - A lean subject or test document.
 * @returns {import('mongoose').Types.ObjectId} The entity id.
 */
function ExtractDocumentId(doc) {
  const result = doc._id;
  return result;
}

/**
 * Sums a numeric field across a list of entries (e.g. total marks across a
 * subject's tests, or subject averages that roll up into the block average).
 *
 * @param {Array<Object>} entries - The entries to sum over.
 * @param {string} field - The numeric field name to sum ("total_mark" | "subject_average").
 * @returns {number} The summed values.
 */
function SumField(entries, field) {
  let sum = 0;
  for (const entry of entries) {
    sum += entry[field];
  }
  return sum;
}

/**
 * Maps a grade document into a (student, test) key -> grade entry for the
 * collision-free lookup map used while rolling up standings.
 *
 * @param {Object} grade - A lean StudentGrade document.
 * @param {Object} grade.student_id - The student id.
 * @param {Object} grade.test_id - The test id.
 * @returns {[string, Object]} The keyed lookup-map entry.
 */
function MapGradeToKeyedEntry(grade) {
  return [BuildGradeKey({ studentId: grade.student_id, testId: grade.test_id }), grade];
}

/**
 * Builds a hierarchy subject entry carrying its own grading rules and the
 * sibling tests indexed under it.
 *
 * @param {Object} params - The hierarchy inputs.
 * @param {Object} params.subjectDoc - A lean subject document.
 * @param {Map<string, Array<Object>>} params.testsBySubjectId - Tests indexed by subject id.
 * @returns {Object} The subject hierarchy entry.
 */
function BuildHierarchySubject({ subjectDoc, testsBySubjectId }) {
  return {
    _id: subjectDoc._id,
    grading_rules: subjectDoc.grading_rules,
    tests: testsBySubjectId.get(String(subjectDoc._id)) || [],
  };
}

/**
 * Maps a computed standing payload into a single-student bulkWrite upsert.
 *
 * @param {Object} standing - A computed standing payload.
 * @returns {Object} The bulkWrite updateOne operation.
 */
function BuildUpsertOperation(standing) {
  return {
    updateOne: {
      filter: {
        student_id: standing.student_id,
        academic_year_id: standing.academic_year_id,
        block_id: standing.block_id,
      },
      update: {
        $set: {
          block_average: standing.block_average,
          block_status: standing.block_status,
          subjects: standing.subjects,
        },
      },
      upsert: true,
    },
  };
}

/**
 * Maps a rule label to a schema-valid standing status.
 *
 * @param {string} label - The label matched by a grading rule.
 * @returns {string} The uppercase standing status.
 */
function NormalizeStandingLabel(label) {
  try {
    // *************** Validate input
    label = ValidateAndSanitizeNormalizeStandingLabel(label);
    // *************** Convert the matched label to a schema-valid status
    const upper = String(label).toUpperCase();
    const result = STANDING_STATUSES.includes(upper) ? upper : 'FAIL';
    return result;
  } catch (err) {
    ReThrowHelperError(err, 'normalizing standing label');
  }
}

/**
 * Evaluates a score against the grading rules fetched from the database.
 * Rules are ordered low-to-high; the last matching rule wins so overlapping
 * tiers resolve to the highest satisfied one. No match falls back to FAIL.
 *
 * @param {Object} params - The evaluation inputs.
 * @param {number} params.score - The numeric score.
 * @param {Array<{label: string, operator: string, threshold: number}>} params.gradingRules - Rules fetched from the curriculum models.
 * @returns {string} The standing status for the score.
 */
function EvaluateStanding({ score, gradingRules }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeEvaluateStanding({ score, gradingRules });
    score = value.score;
    gradingRules = value.gradingRules;
    // *************** No grading rules present - default to FAIL
    if (!Array.isArray(gradingRules) || gradingRules.length === 0) {
      return 'FAIL';
    }

    // *************** Walk rules, keep the highest-precedence match
    let bestLabel = null;
    let bestPrecedence = -1;

    for (const rule of gradingRules) {
      // *************** Resolve the comparator function for this rule's operator
      const applyOperator = OPERATOR_FUNCTIONS[rule.operator];
      if (applyOperator && applyOperator({ score, threshold: rule.threshold })) {
        // *************** Normalize the label and look up its fixed precedence
        const normalized = NormalizeStandingLabel(rule.label);
        const precedence = STANDING_PRECEDENCE[normalized];
        // *************** Keep the match with the highest precedence (PASS > RETAKE > FAIL)
        if (precedence > bestPrecedence) {
          bestPrecedence = precedence;
          bestLabel = normalized;
        }
      }
    }
    // *************** Return the winning label, falling back to FAIL
    const result = bestLabel || 'FAIL';
    return result;
  } catch (err) {
    ReThrowHelperError(err, 'evaluating standing');
  }
}

/**
 * Rounds an average to two decimal places.
 *
 * @param {number} value - The raw average.
 * @returns {number} The rounded average.
 */
function RoundToTwoDecimals(value) {
  try {
    // *************** Validate input
    value = ValidateAndSanitizeRoundToTwoDecimals(value);
    // *************** Preserve two decimal places for average precision
    const result = Number(value.toFixed(2));
    return result;
  } catch (err) {
    ReThrowHelperError(err, 'rounding average');
  }
}

/**
 * Builds a case-insensitive (student, test) lookup key.
 *
 * @param {Object} params - The key inputs.
 * @param {string | import("mongoose").Types.ObjectId} params.studentId - The student id.
 * @param {string | import("mongoose").Types.ObjectId} params.testId - The test id.
 * @returns {string} The lookup key.
 */
function BuildGradeKey({ studentId, testId }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeBuildGradeKey({ studentId, testId });
    studentId = value.studentId;
    testId = value.testId;
    // *************** Build a lowercase (student, test) key for collision-free lookups
    const key = `${String(studentId).toLowerCase()}:${String(testId).toLowerCase()}`;
    return key;
  } catch (err) {
    ReThrowHelperError(err, 'building grade key');
  }
}

/**
 * Loads the test's block with all sibling subjects and tests so averages can
 * be rolled up.
 *
 * @param {string} testId - The id of the graded test.
 * @returns {Promise<Object>} The hierarchy rooted at the test's block.
 * @throws {AppError} 404 - Test, subject or block not found.
 */
async function LoadCurriculumHierarchy(testId) {
  try {
    // *************** Validate input
    testId = ValidateAndSanitizeLoadCurriculumHierarchy(testId);

    // *************** Locate the graded test
    const test = await TestModel.findOne({
      _id: testId,
      deleted_at: null,
    })
      .select('subject_id')
      .lean();
    if (!test) {
      throw new AppError('TEST_NOT_FOUND', 404, 'Test not found.');
    }

    // *************** Locate the owning subject
    const subject = await SubjectModel.findOne({
      _id: test.subject_id,
      deleted_at: null,
    })
      .select('block_id')
      .lean();
    // *************** Locate the owning block with its grading rules
    const block = await BlockModel.findOne({
      _id: subject && subject.block_id,
      deleted_at: null,
    })
      .select('grading_rules')
      .lean();
    if (!subject || !block) {
      throw new AppError('CURRICULUM_ENTITY_NOT_FOUND', 404, 'Subject or block not found.');
    }

    // *************** Load the block, its subjects and their tests
    const subjects = await SubjectModel.find({
      block_id: block._id,
      deleted_at: null,
    })
      .select('_id grading_rules')
      .lean();
    const tests = await TestModel.find({
      subject_id: { $in: subjects.map(ExtractDocumentId) },
      deleted_at: null,
    })
      .select('_id subject_id grading_rules')
      .lean();

    // *************** Index sibling tests by subject for O(1) roll-up lookups
    const testsBySubjectId = new Map();
    for (const testDoc of tests) {
      const key = String(testDoc.subject_id);
      if (!testsBySubjectId.has(key)) testsBySubjectId.set(key, []);
      testsBySubjectId.get(key).push(testDoc);
    }

    // *************** Return the block hierarchy with per-subject test lists
    const hierarchySubjects = [];
    for (const subjectDoc of subjects) {
      hierarchySubjects.push(BuildHierarchySubject({ subjectDoc, testsBySubjectId }));
    }
    const hierarchy = {
      block,
      subjects: hierarchySubjects,
      testIds: tests.map(ExtractDocumentId),
    };
    return hierarchy;
  } catch (err) {
    ReThrowHelperError(err, 'loading curriculum hierarchy');
  }
}

/**
 * Builds the nested Block -> Subject -> Test standing document for a single
 * student by rolling their marks up the hierarchy.
 *
 * @param {Object} params - The standing inputs.
 * @param {string} params.studentId - The student id.
 * @param {string} params.academicYearId - The academic year the grades belong to.
 * @param {Object} params.hierarchy - The loaded curriculum hierarchy.
 * @param {Map<string, Object>} params.gradeByKey - Grades keyed by BuildGradeKey.
 * @returns {Object | null} The standing payload, or null when the student has no grades in this block.
 */
function BuildStudentStanding({ studentId, academicYearId, hierarchy, gradeByKey }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeAggregationParams({
      studentIds: [studentId],
      academicYearId,
      hierarchy,
      gradeByKey,
    });
    studentId = value.studentIds[0];
    academicYearId = value.academicYearId;
    hierarchy = value.hierarchy;
    gradeByKey = value.gradeByKey;

    // *************** Roll each subject's graded tests into a subject average
    const subjects = [];

    for (const subject of hierarchy.subjects) {
      const tests = [];
      for (const test of subject.tests) {
        const grade = gradeByKey.get(BuildGradeKey({ studentId, testId: test._id }));
        if (!grade) continue;

        tests.push({
          test_id: test._id,
          total_mark: grade.score,
          test_status: EvaluateStanding({
            score: grade.score,
            gradingRules: test.grading_rules,
          }),
        });
      }

      // *************** Skip subjects the student has no grades for
      if (tests.length === 0) continue;

      const totalMarks = SumField(tests, 'total_mark');
      const subjectAverage = RoundToTwoDecimals(totalMarks / tests.length);
      subjects.push({
        subject_id: subject._id,
        subject_average: subjectAverage,
        subject_status: EvaluateStanding({
          score: subjectAverage,
          gradingRules: subject.grading_rules,
        }),
        tests,
      });
    }

    // *************** Skip the student when no subject has graded tests
    if (subjects.length === 0) return null;

    // *************** Roll subject averages into the block average
    const subjectAverages = SumField(subjects, 'subject_average');
    const blockAverage = RoundToTwoDecimals(subjectAverages / subjects.length);

    // *************** Return the nested standing payload
    const standing = {
      student_id: studentId,
      academic_year_id: academicYearId,
      block_id: hierarchy.block._id,
      block_average: blockAverage,
      block_status: EvaluateStanding({
        score: blockAverage,
        gradingRules: hierarchy.block.grading_rules,
      }),
      subjects,
    };
    return standing;
  } catch (err) {
    ReThrowHelperError(err, 'building student standing');
  }
}

/**
 * Builds the bulkWrite operations (one upsert per student) and collects the
 * computed standings payloads so the caller can push them to the warehouse
 * webhook after persistence.
 *
 * @param {Object} params - The aggregation inputs.
 * @param {Array<string>} params.studentIds - The students to compute standings for.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @param {Object} params.hierarchy - The loaded curriculum hierarchy.
 * @param {Array<Object>} params.grades - All grades for the block in the year.
 * @returns {Object} The bulkWrite operations and the computed standings.
 * @returns {Array<{ updateOne: { filter: Object, update: Object, upsert: boolean } }>} returns.operations - The bulkWrite operations.
 * @returns {Array<Object>} returns.standings - The fully-mapped computed standings (averages, statuses, per-subject breakdowns).
 */
function BuildBulkWriteOperations({ studentIds, academicYearId, hierarchy, grades }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeAggregationParams({
      studentIds,
      academicYearId,
      hierarchy,
      grades,
    });
    studentIds = value.studentIds;
    academicYearId = value.academicYearId;
    hierarchy = value.hierarchy;
    grades = value.grades;

    // *************** Index all grades by (student, test) key
    const gradeByKey = new Map(grades.map(MapGradeToKeyedEntry));

    // *************** Build one upsert operation per student with a standing
    const operations = [];
    const standings = [];
    for (const studentId of studentIds) {
      const standing = BuildStudentStanding({
        studentId,
        academicYearId,
        hierarchy,
        gradeByKey,
      });
      // *************** Skip students with no computable standing in this block
      if (standing === null) continue;
      operations.push(BuildUpsertOperation(standing));
      standings.push(standing);
    }
    const result = { operations, standings };
    return result;
  } catch (err) {
    ReThrowHelperError(err, 'building bulk write operations');
  }
}

/**
 * Recomputes and persists the standings for a batch of students in the block
 * that owns the given tests, using a single bulkWrite of one upsert per student.
 *
 * @param {Object} params - The aggregation payload.
 * @param {Array<string>} params.studentIds - The IDs of the graded students.
 * @param {string} params.testId - The ID of the test that was just graded.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @returns {Promise<Array<Object>>} The persisted standings payloads (empty when no standing was computable).
 */
async function RunGradeAggregation({ studentIds, testId, academicYearId }) {
  try {
    // *************** Validate input
    const spawnValue = ValidateAndSanitizeSpawnGradeAggregator({
      studentIds,
      testId,
      academicYearId,
    });
    studentIds = spawnValue.studentIds;
    testId = spawnValue.testId;
    academicYearId = spawnValue.academicYearId;

    // *************** Load the hierarchy and the relevant grades
    const hierarchy = await LoadCurriculumHierarchy(testId);
    const grades = await StudentGradeModel.find({
      test_id: { $in: hierarchy.testIds },
      academic_year_id: academicYearId,
      student_id: { $in: studentIds },
    })
      .select('student_id test_id score')
      .lean();

    // *************** Persist every standing in a single round-trip
    const { operations, standings } = BuildBulkWriteOperations({
      studentIds,
      academicYearId,
      hierarchy,
      grades,
    });
    if (operations.length > 0) {
      await AcademicStandingModel.bulkWrite(operations);
    }
    return standings;
  } catch (err) {
    ReThrowHelperError(err, 'running grade aggregation');
  }
}

// *************** END: Academic Standing Helper ***************

// *************** EXPORT MODULE ***************
module.exports = {
  EvaluateStanding,
  LoadCurriculumHierarchy,
  RunGradeAggregation,
};
