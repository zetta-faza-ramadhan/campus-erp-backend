// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const { GetStudentsByAcademicYearSchema } = require("./student.validator");

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
async function GetStudentsByAcademicYear(_, args) {
  try {
    const { error, value } = GetStudentsByAcademicYearSchema.validate(args.input);
    if (error) NormalizeGqlError(error);
    const { academic_year_id, page, limit, search } = value;
    return await GetStudentsByAcademicYearHelper({
      academicYearId: academic_year_id,
      page,
      limit,
      search,
    });
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