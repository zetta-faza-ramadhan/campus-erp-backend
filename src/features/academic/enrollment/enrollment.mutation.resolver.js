// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");
const { enrollStudentsSchema } = require("./enrollment.validator");
const { EnrollStudentsHelper } = require("./enrollment.helper");

// *************** MUTATION ***************

/**
 * Enrolls a batch of students into an active academic year.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The updated academic year document.
 */
async function EnrollStudentsToYear(_, { input }) {
  try {
    const { error, value } = enrollStudentsSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await EnrollStudentsHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    EnrollStudentsToYear,
  },
};
