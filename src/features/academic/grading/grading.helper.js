// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const TestModel = require("../curriculum/curriculum.model.test");
const StudentModel = require("../../users/student/student.model");
const StudentGradeModel = require("./student_grade.model");

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeSubmitTestGrades } = require("./grading.validator");

// *************** START: Grading Helper Function ***************

/**
 * Validates a test and a batch of student references, then bulk-inserts
 * the grades all at once.
 *
 * @param {Object} input - Raw grading payload (re-validated internally).
 * @param {string} input.academicYearId - The ID of the academic year the grades belong to.
 * @param {string} input.testId - The ID of the test being graded.
 * @param {Array<Object>} input.grades - Array of { student_id, score } objects.
 * @returns {Promise<Array<Object>>} The inserted StudentGrade documents.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Payload contains invalid student references.
 */
async function SubmitTestGradesHelper({ academicYearId, testId, grades }) {
  // *************** Validate input
  ValidateAndSanitizeSubmitTestGrades({
    academic_year_id: academicYearId,
    test_id: testId,
    grades,
  });

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
    if (!validStudentIdSet.has(grade.student_id)) {
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

  // *************** Bulk insert all grades
  const insertedGrades = await StudentGradeModel.insertMany(mappedGrades);
  return insertedGrades;
}

// *************** END: Grading Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { SubmitTestGradesHelper };
