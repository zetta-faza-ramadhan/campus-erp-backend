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
  // *************** Ensure email and student number are unique
  const existing = await StudentModel.findOne({
    $or: [{ email: data.email }, { student_number: data.student_number }],
  })
    .select("_id email student_number")
    .lean();
  if (existing) {
    if (existing.email === data.email) {
      // *************** Reject duplicate email
      throw new AppError(
        "EMAIL_ALREADY_EXISTS",
        409,
        "Email is already registered.",
      );
    }
    // *************** Reject duplicate student number
    throw new AppError(
      "STUDENT_NUMBER_ALREADY_EXISTS",
      409,
      "Student number is already registered.",
    );
  }
  // *************** Insert the new student
  try {
    return await StudentModel.create(data);
  } catch (err) {
    // *************** Translate concurrent duplicate-key hit into a 409
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      throw new AppError(
        field === "email"
          ? "EMAIL_ALREADY_EXISTS"
          : "STUDENT_NUMBER_ALREADY_EXISTS",
        409,
        "Already registered.",
      );
    }
    throw err;
  }
}

// *************** EXPORT MODULE ***************
module.exports = { CreateStudentHelper };
