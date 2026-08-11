// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const { ReThrowHelperError } = require("../../../core/helper_error");
const { OBJECT_ID_PATTERN } = require("../../../core/validators");
const TestModel = require("../curriculum/curriculum.model.test");
const SubjectModel = require("../curriculum/curriculum.model.subject");
const BlockModel = require("../curriculum/curriculum.model.block");
const StudentGradeModel = require("./student_grade.model");
const AcademicStandingModel = require("./academic_standing.model");

// *************** GLOBAL VARIABLES ***************
// *************** Operator -> comparator used to resolve grading tiers
const OPERATOR_FUNCTIONS = {
  ">": (score, threshold) => score > threshold,
  ">=": (score, threshold) => score >= threshold,
  "<": (score, threshold) => score < threshold,
  "<=": (score, threshold) => score <= threshold,
  "==": (score, threshold) => score === threshold,
};

// *************** Statuses accepted by the AcademicStanding schema
const STANDING_STATUSES = ["PASS", "FAIL", "RETAKE"];

// *************** START: Academic Standing Helper ***************

/**
 * Validates the shared aggregation parameters used by BuildStudentStanding,
 * BuildBulkWriteOperations, and RunGradeAggregation.
 *
 * @param {Object} params - The aggregation params to validate.
 * @param {Array<string>} params.studentIds - Non-empty array of student IDs.
 * @param {string} params.academicYearId - The academic year ObjectId.
 * @param {Object} params.hierarchy - The loaded curriculum hierarchy.
 * @param {Array<Object>} [params.grades] - All grades for the block.
 * @throws {AppError} 400 - Any required param is missing or malformed.
 */
function ValidateAggregationParams({ studentIds, academicYearId, hierarchy, grades }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new AppError("INVALID_STUDENT_IDS", 400, "studentIds must be a non-empty array.");
  }
  if (!academicYearId) {
    throw new AppError("INVALID_ACADEMIC_YEAR_ID", 400, "academicYearId is required.");
  }
  if (hierarchy !== undefined && hierarchy !== null) {
    if (!hierarchy.block || !Array.isArray(hierarchy.subjects)) {
      throw new AppError("INVALID_HIERARCHY", 400, "hierarchy must contain block and subjects array.");
    }
  }
  if (grades !== undefined && !Array.isArray(grades)) {
    throw new AppError("INVALID_GRADES", 400, "grades must be an array.");
  }
}

/**
 * Maps a rule label to a schema-valid standing status.
 *
 * @param {string} label - The label matched by a grading rule.
 * @returns {string} The uppercase standing status.
 */
function NormalizeStandingLabel(label) {
  // *************** Validate input
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new AppError("INVALID_STANDING_LABEL", 400, "Standing label must be a non-empty string.");
  }
  // *************** Convert the matched label to a schema-valid status
  const upper = String(label).toUpperCase();
  return STANDING_STATUSES.includes(upper) ? upper : "FAIL";
}

/**
 * Evaluates a score against the grading rules fetched from the database.
 * Rules are ordered low-to-high; the last matching rule wins so overlapping
 * tiers resolve to the highest satisfied one. No match falls back to FAIL.
 *
 * @param {number} score - The numeric score.
 * @param {Array<{label: string, operator: string, threshold: number}>} gradingRules - Rules fetched from the curriculum models.
 * @returns {string} The standing status for the score.
 */
function EvaluateStanding(score, gradingRules) {
  // *************** Validate input
  if (typeof score !== "number" || Number.isNaN(score)) {
    throw new AppError("INVALID_SCORE", 400, "Score must be a valid number.");
  }
  // *************** No grading rules present - default to FAIL
  if (!Array.isArray(gradingRules) || gradingRules.length === 0) {
    return "FAIL";
  }

  // *************** Walk rules low-to-high, the last satisfied tier wins
  let matchedLabel = null;
  for (const rule of gradingRules) {
    const applyOperator = OPERATOR_FUNCTIONS[rule.operator];
    if (applyOperator && applyOperator(score, rule.threshold)) {
      matchedLabel = rule.label;
    }
  }
  // *************** Normalize the winning label, falling back to FAIL
  return matchedLabel ? NormalizeStandingLabel(matchedLabel) : "FAIL";
}

/**
 * Rounds an average to two decimal places.
 *
 * @param {number} value - The raw average.
 * @returns {number} The rounded average.
 */
function RoundToTwoDecimals(value) {
  // *************** Validate input
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError("INVALID_AVERAGE", 400, "Average value must be a valid number.");
  }
  // *************** Preserve two decimal places for average precision
  return Math.round(value * 100) / 100;
}

/**
 * Builds a case-insensitive (student, test) lookup key.
 *
 * @param {string | import("mongoose").Types.ObjectId} studentId - The student id.
 * @param {string | import("mongoose").Types.ObjectId} testId - The test id.
 * @returns {string} The lookup key.
 */
function BuildGradeKey(studentId, testId) {
  // *************** Validate input
  if (!studentId || !testId) {
    throw new AppError("INVALID_GRADE_KEY", 400, "studentId and testId are required.");
  }
  // *************** Build a lowercase (student, test) key for collision-free lookups
  return `${String(studentId).toLowerCase()}:${String(testId).toLowerCase()}`;
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
    if (!testId || !String(testId).match(OBJECT_ID_PATTERN)) {
      throw new AppError("INVALID_TEST_ID", 400, "testId must be a valid ObjectId.");
    }

    // *************** Locate the graded test
    const test = await TestModel.findOne({
      _id: testId,
      deleted_at: null,
    })
      .select("subject_id")
      .lean();
    if (!test) {
      throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
    }

    // *************** Locate the owning subject
    const subject = await SubjectModel.findOne({
      _id: test.subject_id,
      deleted_at: null,
    })
      .select("block_id")
      .lean();
    // *************** Locate the owning block with its grading rules
    const block = await BlockModel.findOne({
      _id: subject && subject.block_id,
      deleted_at: null,
    })
      .select("grading_rules")
      .lean();
    if (!subject || !block) {
      throw new AppError(
        "CURRICULUM_ENTITY_NOT_FOUND",
        404,
        "Subject or block not found.",
      );
    }

    // *************** Load the block, its subjects and their tests
    const subjects = await SubjectModel.find({
      block_id: block._id,
      deleted_at: null,
    })
      .select("_id grading_rules")
      .lean();
    const tests = await TestModel.find({
      subject_id: { $in: subjects.map((subjectDoc) => subjectDoc._id) },
      deleted_at: null,
    })
      .select("_id subject_id grading_rules")
      .lean();

    // *************** Index sibling tests by subject for O(1) roll-up lookups
    const testsBySubjectId = new Map();
    for (const testDoc of tests) {
      const key = String(testDoc.subject_id);
      if (!testsBySubjectId.has(key)) testsBySubjectId.set(key, []);
      testsBySubjectId.get(key).push(testDoc);
    }

    // *************** Return the block hierarchy with per-subject test lists
    return {
      block,
      subjects: subjects.map((subjectDoc) => ({
        _id: subjectDoc._id,
        grading_rules: subjectDoc.grading_rules,
        tests: testsBySubjectId.get(String(subjectDoc._id)) || [],
      })),
      testIds: tests.map((testDoc) => testDoc._id),
    };
  } catch (err) {
    ReThrowHelperError(err, "loading curriculum hierarchy");
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
function BuildStudentStanding({
  studentId,
  academicYearId,
  hierarchy,
  gradeByKey,
}) {
  // *************** Validate input
  if (!studentId) {
    throw new AppError("INVALID_STUDENT_ID", 400, "studentId is required.");
  }
  ValidateAggregationParams({ studentIds: [studentId], academicYearId, hierarchy });
  if (!(gradeByKey instanceof Map)) {
    throw new AppError("INVALID_GRADE_KEY_MAP", 400, "gradeByKey must be a Map.");
  }

  // *************** Roll each subject's graded tests into a subject average
  const subjects = [];

  for (const subject of hierarchy.subjects) {
    const tests = [];
    for (const test of subject.tests) {
      const grade = gradeByKey.get(BuildGradeKey(studentId, test._id));
      if (!grade) continue;

      tests.push({
        test_id: test._id,
        total_mark: grade.score,
        test_status: EvaluateStanding(grade.score, test.grading_rules),
      });
    }

    // *************** Skip subjects the student has no grades for
    if (tests.length === 0) continue;

    const totalMarks = tests.reduce((sum, test) => sum + test.total_mark, 0);
    const subjectAverage = RoundToTwoDecimals(totalMarks / tests.length);
    subjects.push({
      subject_id: subject._id,
      subject_average: subjectAverage,
      subject_status: EvaluateStanding(subjectAverage, subject.grading_rules),
      tests,
    });
  }

  // *************** Skip the student when no subject has graded tests
  if (subjects.length === 0) return null;

  // *************** Roll subject averages into the block average
  const subjectAverages = subjects.reduce(
    (sum, subject) => sum + subject.subject_average,
    0,
  );
  const blockAverage = RoundToTwoDecimals(subjectAverages / subjects.length);

  // *************** Return the nested standing payload
  return {
    student_id: studentId,
    academic_year_id: academicYearId,
    block_id: hierarchy.block._id,
    block_average: blockAverage,
    block_status: EvaluateStanding(blockAverage, hierarchy.block.grading_rules),
    subjects,
  };
}

/**
 * Builds the bulkWrite operations (one upsert per student).
 *
 * @param {Object} params - The aggregation inputs.
 * @param {Array<string>} params.studentIds - The students to compute standings for.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @param {Object} params.hierarchy - The loaded curriculum hierarchy.
 * @param {Array<Object>} params.grades - All grades for the block in the year.
 * @returns {Array<{ updateOne: { filter: Object, update: Object, upsert: boolean } }>} The bulkWrite operations.
 */
function BuildBulkWriteOperations({
  studentIds,
  academicYearId,
  hierarchy,
  grades,
}) {
  // *************** Validate input
  ValidateAggregationParams({ studentIds, academicYearId, hierarchy, grades });

  // *************** Index all grades by (student, test) key
  const gradeByKey = new Map(
    grades.map((grade) => [
      BuildGradeKey(grade.student_id, grade.test_id),
      grade,
    ]),
  );

  // *************** Build one standing (or null) per input student
  return studentIds
    .map((studentId) =>
      BuildStudentStanding({
        studentId,
        academicYearId,
        hierarchy,
        gradeByKey,
      }),
    )
    // *************** Keep only students with a computable standing
    .filter((standing) => standing !== null)
    // *************** Map each standing into an upsert write operation
    .map((standing) => ({
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
    }));
}

/**
 * Recomputes and persists the standings for a batch of students in the block
 * that owns the given test, using a single bulkWrite of one upsert per student.
 *
 * @param {Object} params - The aggregation payload.
 * @param {Array<string>} params.studentIds - The IDs of the graded students.
 * @param {string} params.testId - The ID of the test that was just graded.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @returns {Promise<void>} Resolves once the standings have been written.
 */
async function RunGradeAggregation({ studentIds, testId, academicYearId }) {
  try {
    // *************** Validate input
    if (!testId || !String(testId).match(OBJECT_ID_PATTERN)) {
      throw new AppError("INVALID_TEST_ID", 400, "testId must be a valid ObjectId.");
    }
    ValidateAggregationParams({ studentIds, academicYearId });

    // *************** Load the hierarchy and the relevant grades
    const hierarchy = await LoadCurriculumHierarchy(testId);
    const grades = await StudentGradeModel.find({
      test_id: { $in: hierarchy.testIds },
      academic_year_id: academicYearId,
      student_id: { $in: studentIds },
    })
      .select("student_id test_id score")
      .lean();

    // *************** Persist every standing in a single round-trip
    const operations = BuildBulkWriteOperations({
      studentIds,
      academicYearId,
      hierarchy,
      grades,
    });
    if (operations.length > 0) {
      await AcademicStandingModel.bulkWrite(operations);
    }
  } catch (err) {
    ReThrowHelperError(err, "running grade aggregation");
  }
}

// *************** END: Academic Standing Helper ***************

// *************** EXPORT MODULE ***************
module.exports = {
  EvaluateStanding,
  LoadCurriculumHierarchy,
  RunGradeAggregation,
};
