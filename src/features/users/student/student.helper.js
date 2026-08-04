// *************** IMPORT LIBRARY ***************
const { Types } = require("mongoose");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const StudentModel = require("./student.model");
const AcademicYearModel = require("../../academic/enrollment/academic_year.model");

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
// *************** Default pagination applied when no page/limit is provided by the client.
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
// *************** Hard cap on page size to keep large $in / result sets bounded.
const MAX_LIMIT = 100;

// *************** CRUD: STUDENT ***************

/**
 * Creates a new student after ensuring the email and student number are unique.
 *
 * @param {Object} input - Validated student input payload.
 * @returns {Promise<Object>} The created student document.
 * @throws {AppError} 409 - Email or student number already registered.
 */
async function CreateStudentHelper({ firstName, lastName, email, studentNumber }) {
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
 * @param {Object} input - Validated payload with academicYearId, page, limit, search.
 * @returns {Promise<Object>} Paginated response { total_count, current_page, total_pages, data }.
 * @throws {AppError} 404 - Academic year not found.
 */
async function GetStudentsByAcademicYearHelper({ academicYearId, page, limit, search }) {
  // *************** Validate the target academic year exists
  const year = await AcademicYearModel.findOne({
    _id: academicYearId,
    deleted_at: null,
  })
    .select("_id name")
    .lean();
  if (!year) {
    throw new AppError(
      "ACADEMIC_YEAR_NOT_FOUND",
      404,
      "Academic year not found.",
    );
  }

  // *************** Resolve pagination defaults
  page = page ?? DEFAULT_PAGE;
  limit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
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

  // *************** Return paginated payload
  return {
    total_count: total,
    current_page: page,
    total_pages: Math.ceil(total / limit),
    data: result.data,
  };
}

// *************** EXPORT MODULE ***************
module.exports = {
  CreateStudentHelper,
  GetStudentsByAcademicYearHelper,
};
