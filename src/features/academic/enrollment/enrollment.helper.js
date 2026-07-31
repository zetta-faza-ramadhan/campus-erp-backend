// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const AcademicYearModel = require("./academic_year.model");
const StudentModel = require("../../users/student/student.model");

// *************** ENROLLMENT ***************

/**
 * Enrolls a batch of students into an active academic year using sequential,
 * atomic bi-directional array updates.
 *
 * @param {Object} input - Validated enrollment payload with academic_year_id and student_ids.
 * @returns {Promise<Object>} The updated academic year document.
 * @throws {AppError} 404 - Academic year not found.
 * @throws {AppError} 400 - Academic year is closed to new enrollments.
 * @throws {AppError} 400 - Payload contains invalid or deleted student references.
 */
async function EnrollStudentsHelper(input) {
  const year = await AcademicYearModel.findOne({
    _id: input.academic_year_id,
    deleted_at: null,
  }).lean();
  if (!year) {
    throw new AppError(
      "ACADEMIC_YEAR_NOT_FOUND",
      404,
      "Academic year not found.",
    );
  }
  if (year.status !== "active") {
    throw new AppError(
      "ACADEMIC_YEAR_CLOSED",
      400,
      "Academic year is closed to new enrollments.",
    );
  }

  const studentCount = await StudentModel.countDocuments({
    _id: { $in: input.student_ids },
    deleted_at: null,
  });
  if (studentCount !== input.student_ids.length) {
    throw new AppError(
      "INVALID_STUDENT_REFERENCE",
      400,
      "One or more student IDs are invalid or deleted.",
    );
  }

  const updatedYear = await AcademicYearModel.findByIdAndUpdate(
    input.academic_year_id,
    { $addToSet: { student_ids: { $each: input.student_ids } } },
    { returnDocument: "after" },
  );
  await StudentModel.updateMany(
    { _id: { $in: input.student_ids } },
    { $addToSet: { academic_year_ids: input.academic_year_id } },
  );
  return updatedYear;
}

// *************** EXPORT MODULE ***************
module.exports = { EnrollStudentsHelper };
