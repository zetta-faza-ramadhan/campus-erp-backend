// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require('../../../core/graphql_error');

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeSubmitTestGrades } = require('./grading.validator');

// *************** IMPORT HELPER FUNCTION ***************
const { SubmitTestGradesHelper } = require('./grading.helper');

// *************** MUTATION ***************

/**
 * Submits a batch of test grades for a given academic year and test.
 * Transport-only: validates at the boundary, maps snake_case → camelCase,
 * delegates to the business-logic helper, and normalizes any error.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Array<Object>>} The inserted StudentGrade documents.
 */
async function SubmitTestGrades(_, { input }) {
  try {
    // *************** Validate and sanitize at the transport boundary
    const value = ValidateAndSanitizeSubmitTestGrades(input);

    // *************** Delegate to the helper with the sanitized values (snake_case → camelCase mapping happens here)
    const result = await SubmitTestGradesHelper({
      academicYearId: value.academic_year_id,
      testId: value.test_id,
      grades: value.grades,
    });
    return result;
  } catch (err) {
    // *************** Normalize any thrown error into the standard GraphQL error shape
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    SubmitTestGrades,
  },
};
