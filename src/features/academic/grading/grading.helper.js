// *************** IMPORT LIBRARY ***************
const path = require("path");
const { Worker } = require("worker_threads");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const logger = require("../../../core/logger");
const TestModel = require("../curriculum/curriculum.model.test");
const StudentModel = require("../../users/student/student.model");
const StudentGradeModel = require("./student_grade.model");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeSubmitTestGrades,
  ValidateAndSanitizeSpawnGradeAggregator,
} = require("./grading.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require("../../../core/helper_error");

// *************** START: Grading Helper Function ***************

/**
 * Validates a test and a batch of student references, then bulk-inserts
 * the grades all at once, and finally spawns a background worker thread to
 * recompute the hierarchical standings without delaying the response.
 *
 * @param {Object} input - Raw grading payload.
 * @param {string} input.academicYearId - The ID of the academic year the grades belong to.
 * @param {string} input.testId - The ID of the test being graded.
 * @param {Array<Object>} input.grades - Array of grade entries.
 * @param {string} input.grades[].student_id - The ID of the graded student.
 * @param {number} input.grades[].score - The student's score on the test.
 * @returns {Promise<Array<Object>>} The inserted StudentGrade documents.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Payload contains invalid student references.
 */
async function SubmitTestGradesHelper({ academicYearId, testId, grades }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeSubmitTestGrades({
      academic_year_id: academicYearId,
      test_id: testId,
      grades,
    });

    academicYearId = value.academic_year_id;
    testId = value.test_id;
    grades = value.grades;

    // *************** Verify the test exists
    const test = await TestModel.findOne({
      _id: testId,
      deleted_at: null,
    }).lean();
    if (!test) {
      throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
    }

    // *************** Extract all student IDs into a flat array
    const extractedStudentIds = grades.map((grade) => grade.student_id);

    // *************** Find all valid, non-deleted students in a single query
    const validStudentIds = await StudentModel.distinct("_id", {
      _id: { $in: extractedStudentIds },
      deleted_at: null,
    });
    const validStudentIdSet = new Set(validStudentIds.map(String));

    // *************** Validate that every student exists and is not deleted
    for (const grade of grades) {
      if (!validStudentIdSet.has(grade.student_id.toLowerCase())) {
        throw new AppError(
          "INVALID_STUDENT_REFERENCE",
          400,
          "One or more student IDs are invalid or deleted.",
        );
      }
    }

    // *************** Transform grades for Mongoose, injecting the year and test
    const mappedGrades = grades.map((grade) => ({
      student_id: grade.student_id,
      test_id: testId,
      academic_year_id: academicYearId,
      score: grade.score,
    }));

    // *************** Bulk insert all grades (E11000 duplicate-key re-thrown unchanged)
    const insertedGrades = await StudentGradeModel.insertMany(mappedGrades);

    // *************** Spawn the aggregation worker, fire-and-forget
    SpawnGradeAggregator({
      studentIds: extractedStudentIds,
      testId,
      academicYearId,
    });

    return insertedGrades;
  } catch (err) {
    ReThrowHelperError(err, "submitting grades");
  }
}

/**
 * Spawns the grade-aggregation worker thread and logs any background crash.
 * Intentionally not awaited: the standings recomputation is CPU-heavy, so the
 * caller returns its response while the worker processes in the background.
 *
 * @param {Object} params - The aggregation payload.
 * @param {Array<string>} params.studentIds - The IDs of the just-graded students.
 * @param {string} params.testId - The ID of the test that was just graded.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @returns {void}
 */
function SpawnGradeAggregator({ studentIds, testId, academicYearId }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeSpawnGradeAggregator({
      studentIds,
      testId,
      academicYearId,
    });
    studentIds = value.studentIds;
    testId = value.testId;
    academicYearId = value.academicYearId;

    const payload = JSON.stringify({
      student_ids: studentIds,
      test_id: testId,
      academic_year_id: academicYearId,
    });

    const worker = new Worker(
      path.join(__dirname, "../../../workers/grade_aggregator.worker.js"),
      { workerData: payload },
    );

    // *************** Attach listeners to log worker crashes/failures/completion
    logger.AttachWorkerListeners(worker, "grade_aggregator");
  } catch (err) {
    logger.error(
      { operation: "grade_aggregator.spawn", err },
      "Failed to spawn grade aggregation worker",
    );
  }
}

// *************** END: Grading Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { SubmitTestGradesHelper };
