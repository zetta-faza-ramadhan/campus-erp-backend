// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const AcademicYearModel = require("./academic_year.model");
const StudentModel = require("../../users/student/student.model");

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeEnrollStudents } = require("./enrollment.validator");

// *************** ENROLLMENT ***************

/**
 * Enrolls a batch of students into an active academic year using sequential,
 * atomic bi-directional array updates.
 *
 * @param {Object} input - Raw enrollment payload (re-validated internally).
 * @param {string} input.academicYearId - The ID of the academic year.
 * @param {Array<string>} input.studentIds - The IDs of students to enroll.
 * @returns {Promise<Object>} The updated academic year document.
 * @throws {AppError} 404 - Academic year not found.
 * @throws {AppError} 400 - Academic year is closed to new enrollments.
 * @throws {AppError} 400 - Payload contains invalid or deleted student references.
 */
async function EnrollStudentsHelper({ academicYearId, studentIds }) {
  // *************** Validate input
  const value = ValidateAndSanitizeEnrollStudents({
    academic_year_id: academicYearId,
    student_ids: studentIds,
  });
  academicYearId = value.academic_year_id;
  studentIds = value.student_ids;

  // *************** Validate target academic year
  const year = await AcademicYearModel.findOne({
    _id: academicYearId,
    deleted_at: null,
  }).lean();
  if (!year) {
    throw new AppError(
      "ACADEMIC_YEAR_NOT_FOUND",
      404,
      "Academic year not found.",
    );
  }
  if (year.status !== "ACTIVE") {
    throw new AppError(
      "ACADEMIC_YEAR_CLOSED",
      400,
      "Academic year is closed to new enrollments.",
    );
  }

  // *************** Collapse duplicate IDs into a unique set
  const uniqueStudentIds = [...new Set(studentIds)];

  // *************** Verify all student references exist
  const studentCount = await StudentModel.countDocuments({
    _id: { $in: uniqueStudentIds },
    deleted_at: null,
  });
  if (studentCount !== uniqueStudentIds.length) {
    throw new AppError(
      "INVALID_STUDENT_REFERENCE",
      400,
      "One or more student IDs are invalid or deleted.",
    );
  }

  // *************** Atomically add students to the year
  const updatedYear = await AcademicYearModel.findByIdAndUpdate(
    academicYearId,
    { $addToSet: { student_ids: { $each: uniqueStudentIds } } },
    { returnDocument: "after" },
  );
  // *************** Atomically link the year to each student
  await StudentModel.updateMany(
    { _id: { $in: uniqueStudentIds } },
    { $addToSet: { academic_year_ids: academicYearId } },
  );
  return updatedYear;
}

// *************** EXPORT MODULE ***************
module.exports = { EnrollStudentsHelper };
