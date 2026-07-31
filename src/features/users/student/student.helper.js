// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const StudentModel = require("./student.model");

// *************** CRUD: STUDENT ***************

/**
 * Creates a new student after ensuring the email and student number are unique.
 *
 * @param {Object} data - Validated student input payload.
 * @returns {Promise<Object>} The created student document.
 * @throws {AppError} 409 - Email or student number already registered.
 */
async function CreateStudentHelper(data) {
  // *************** ENSURE EMAIL AND STUDENT NUMBER ARE UNIQUE
  const existing = await StudentModel.findOne({
    $or: [{ email: data.email }, { student_number: data.student_number }],
  })
    .select("_id email student_number")
    .lean();
  if (existing) {
    if (existing.email === data.email) {
      // *************** REJECT DUPLICATE EMAIL
      throw new AppError(
        "EMAIL_ALREADY_EXISTS",
        409,
        "Email is already registered.",
      );
    }
    // *************** REJECT DUPLICATE STUDENT NUMBER
    throw new AppError(
      "STUDENT_NUMBER_ALREADY_EXISTS",
      409,
      "Student number is already registered.",
    );
  }
  // *************** INSERT THE NEW STUDENT
  return await StudentModel.create(data);
}

// *************** EXPORT MODULE ***************
module.exports = { CreateStudentHelper };
