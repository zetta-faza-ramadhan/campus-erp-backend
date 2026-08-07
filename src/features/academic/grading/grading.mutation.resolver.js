// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeSubmitTestGrades,
} = require("./grading.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { SubmitTestGradesHelper } = require("./grading.helper");

// *************** MUTATION ***************

/**
 * Submits a batch of test grades for a given academic year and test.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Array<Object>>} The inserted StudentGrade documents.
 */
async function SubmitTestGrades(_, { input }) {
  try {
    const value = ValidateAndSanitizeSubmitTestGrades(input);
    const result = await SubmitTestGradesHelper({
      academicYearId: value.academic_year_id,
      testId: value.test_id,
      grades: value.grades,
    });
    return result;
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    SubmitTestGrades,
  },
};