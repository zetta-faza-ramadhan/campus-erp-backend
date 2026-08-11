// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const TestModel = require("../curriculum/curriculum.model.test");
const SubjectModel = require("../curriculum/curriculum.model.subject");
const BlockModel = require("../curriculum/curriculum.model.block");
const StudentGradeModel = require("./student_grade.model");
const AcademicStandingModel = require("./academic_standing.model");

// *************** GLOBAL VARIABLES ***************
// Operator -> comparator used to evaluate grading rules dynamically
const OPERATOR_FUNCTIONS = {
  ">": (score, threshold) => score > threshold,
  ">=": (score, threshold) => score >= threshold,
  "<": (score, threshold) => score < threshold,
  "<=": (score, threshold) => score <= threshold,
  "==": (score, threshold) => score === threshold,
};

// Statuses accepted by the AcademicStanding schema
const STANDING_STATUSES = ["PASS", "FAIL", "RETAKE"];

// *************** START: Academic Standing Helper ***************

/**
 * Maps a rule label to a schema-valid standing status.
 *
 * @param {string} label - The label matched by a grading rule.
 * @returns {string} The uppercase standing status.
 */
function NormalizeStandingLabel(label) {
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
  if (!Array.isArray(gradingRules) || gradingRules.length === 0) {
    return "FAIL";
  }

  let matchedLabel = null;
  for (const rule of gradingRules) {
    const applyOperator = OPERATOR_FUNCTIONS[rule.operator];
    if (applyOperator && applyOperator(score, rule.threshold)) {
      matchedLabel = rule.label;
    }
  }
  return matchedLabel ? NormalizeStandingLabel(matchedLabel) : "FAIL";
}

/**
 * Rounds an average to two decimal places.
 *
 * @param {number} value - The raw average.
 * @returns {number} The rounded average.
 */
function RoundToTwoDecimals(value) {
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
  const test = await TestModel.findOne({
    _id: testId,
    deleted_at: null,
  })
    .select("subject_id")
    .lean();
  if (!test) {
    throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
  }

  const subject = await SubjectModel.findOne({
    _id: test.subject_id,
    deleted_at: null,
  })
    .select("block_id")
    .lean();
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

  const testsBySubjectId = new Map();
  for (const testDoc of tests) {
    const key = String(testDoc.subject_id);
    if (!testsBySubjectId.has(key)) testsBySubjectId.set(key, []);
    testsBySubjectId.get(key).push(testDoc);
  }

  return {
    block,
    subjects: subjects.map((subjectDoc) => ({
      _id: subjectDoc._id,
      grading_rules: subjectDoc.grading_rules,
      tests: testsBySubjectId.get(String(subjectDoc._id)) || [],
    })),
    testIds: tests.map((testDoc) => testDoc._id),
  };
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

  if (subjects.length === 0) return null;

  const subjectAverages = subjects.reduce(
    (sum, subject) => sum + subject.subject_average,
    0,
  );
  const blockAverage = RoundToTwoDecimals(subjectAverages / subjects.length);

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
  const gradeByKey = new Map(
    grades.map((grade) => [
      BuildGradeKey(grade.student_id, grade.test_id),
      grade,
    ]),
  );

  return studentIds
    .map((studentId) =>
      BuildStudentStanding({
        studentId,
        academicYearId,
        hierarchy,
        gradeByKey,
      }),
    )
    .filter((standing) => standing !== null)
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
}

// *************** END: Academic Standing Helper ***************

// *************** EXPORT MODULE ***************
module.exports = {
  EvaluateStanding,
  LoadCurriculumHierarchy,
  RunGradeAggregation,
};
