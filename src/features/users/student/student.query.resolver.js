// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const { GetStudentsByAcademicYearSchema } = require("./student.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { GetStudentsByAcademicYearHelper } = require("./student.helper");

// *************** FIELD RESOLVERS ***************
/**
 * Converts the MongoDB ObjectId _id to a string for the GraphQL ID scalar.
 *
 * @param {Object} parent - The parent document.
 * @returns {string} The stringified _id.
 */
function IdFieldResolver(parent) {
  return parent._id.toString();
}

/**
 * Resolves the AcademicYear documents a student belongs to.
 *
 * @param {Object} parent - The Student parent document.
 * @param {Object} _ - Unused query arguments.
 * @param {Object} context - GraphQL context containing per-request loaders.
 * @returns {Promise<Array<Object|null>>} Batch-loaded academic years in order.
 */
function AcademicYearsFieldResolver(parent, _, context) {
  // *************** Batch load via per-request DataLoader (avoids N+1)
  return context.loaders.academicYearLoader.loadMany(parent.academic_year_ids);
}

// *************** QUERY ***************

/**
 * Retrieves paginated students enrolled in an academic year.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing input.
 * @returns {Promise<Object>} Paginated student response.
 */
async function GetStudentsByAcademicYear(_, args) {
  try {
    const { error, value } = GetStudentsByAcademicYearSchema.validate(args.input);
    if (error) NormalizeGqlError(error);
    return await GetStudentsByAcademicYearHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Query: {
    GetStudentsByAcademicYear,
  },
  Student: {
    _id: IdFieldResolver,
    academic_years: AcademicYearsFieldResolver,
  },
};