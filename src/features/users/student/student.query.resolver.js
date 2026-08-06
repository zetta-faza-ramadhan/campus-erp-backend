// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeGetStudentsByAcademicYear,
} = require("./student.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { GetStudentsByAcademicYearHelper } = require("./student.helper");

// *************** IMPORT LOADER ***************
const { AcademicYearsFieldResolver } = require("./student.loader.resolver");

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

// *************** QUERY ***************

/**
 * Retrieves paginated students enrolled in an academic year.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing input.
 * @returns {Promise<Object>} Paginated student response.
 */
async function GetStudentsByAcademicYear(_, { input }) {
  try {
    const value = ValidateAndSanitizeGetStudentsByAcademicYear(input);
    const result = await GetStudentsByAcademicYearHelper({
      academicYearId: value.academic_year_id,
      page: value.page,
      limit: value.limit,
      search: value.search,
    });
    return result;
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
