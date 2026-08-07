// *************** IMPORT LIBRARY ***************
const { Types } = require("mongoose");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const StudentModel = require("./student.model");
const AcademicYearModel = require("../../academic/enrollment/academic_year.model");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeCreateStudent,
  ValidateAndSanitizeGetStudentsByAcademicYear,
} = require("./student.validator");

// *************** GLOBAL VARIABLES ***************
// *************** Reusable field selection applied early in the aggregation pipeline.
const STUDENT_PROJECT_FIELDS = {
  first_name: 1,
  last_name: 1,
  email: 1,
  student_number: 1,
  registration_date: 1,
  academic_year_ids: 1,
  deleted_at: 1,
  created_at: 1,
  updated_at: 1,
};

// *************** CRUD: STUDENT ***************

/**
 * Creates a new student after ensuring the email and student number are unique.
 *
 * @param {Object} input - Raw student input payload (re-validated internally).
 * @returns {Promise<Object>} The created student document.
 * @throws {AppError} 409 - Email or student number already registered.
 */
async function CreateStudentHelper({
  firstName,
  lastName,
  email,
  studentNumber,
}) {
  // *************** Validate input
  const value = ValidateAndSanitizeCreateStudent({
    first_name: firstName,
    last_name: lastName,
    email,
    student_number: studentNumber,
  });
  firstName = value.first_name;
  lastName = value.last_name;
  email = value.email;
  studentNumber = value.student_number;

  // *************** Ensure email and student number are unique
  const existing = await StudentModel.findOne({
    $or: [{ email }, { student_number: studentNumber }],
  })
    .select("_id email student_number")
    .lean();
  if (existing) {
    if (existing.email === email) {
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
    return await StudentModel.create({
      first_name: firstName,
      last_name: lastName,
      email,
      student_number: studentNumber,
    });
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

// *************** QUERY: STUDENT ***************

/**
 * Retrieves students enrolled in an academic year with pagination and search.
 *
 * Ensures the academic year exists before querying, applies search to the
 * student's first/last name, and returns page metadata alongside the records.
 *
 * @param {Object} input - Raw payload with academicYearId, page, limit, search (re-validated internally).
 * @returns {Promise<Object>} Paginated response { total_count, current_page, total_pages, data }.
 * @throws {AppError} 404 - Academic year not found.
 */
// *************** START: GetStudentsByAcademicYearHelper ***************
async function GetStudentsByAcademicYearHelper({
  academicYearId,
  page,
  limit,
  search,
}) {
  // *************** Validate input
  const value = ValidateAndSanitizeGetStudentsByAcademicYear({
    academic_year_id: academicYearId,
    page,
    limit,
    search,
  });
  academicYearId = value.academic_year_id;
  page = value.page;
  limit = value.limit;
  search = value.search;

  // *************** Resolve the $skip offset from the sanitized pagination
  const skip = (page - 1) * limit;

  // *************** Normalize the academic year id to an ObjectId
  const normalizedAcademicYearId = new Types.ObjectId(academicYearId);

  // *************** Stage 1: $match - enrolled in the year, active, optional search
  const match = {
    academic_year_ids: normalizedAcademicYearId,
    deleted_at: null,
  };
  // *************** Apply optional search on first/last name
  if (search) {
    // *************** Escape regex metacharacters so search is literal
    const term = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { first_name: { $regex: term, $options: "i" } },
      { last_name: { $regex: term, $options: "i" } },
    ];
  }

  // *************** Stage 2: $facet - metadata (count) and data (page slice)
  const pipeline = [
    { $match: match },
    { $sort: { registration_date: -1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: STUDENT_PROJECT_FIELDS },
        ],
      },
    },
  ];

  // *************** Execute the single aggregation pipeline
  const [result] = await StudentModel.aggregate(pipeline);
  const total = result.metadata[0]?.total ?? 0;

  // *************** Defer existence check to empty-result path
  if (total === 0) {
    const year = await AcademicYearModel.findOne({
      _id: academicYearId,
      deleted_at: null,
    })
      .select("_id")
      .lean();
    if (!year) {
      throw new AppError(
        "ACADEMIC_YEAR_NOT_FOUND",
        404,
        "Academic year not found.",
      );
    }
  }

  // *************** Return paginated payload
  const totalPages = Math.ceil(total / limit);
  return {
    total_count: total,
    current_page: total > 0 ? Math.min(page, totalPages) : 1,
    total_pages: totalPages,
    data: result.data,
  };
}
// *************** END: GetStudentsByAcademicYearHelper ***************

// *************** EXPORT MODULE ***************
module.exports = {
  CreateStudentHelper,
  GetStudentsByAcademicYearHelper,
};
