// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const { studentSchema } = require("./student.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { CreateStudentHelper } = require("./student.helper");

// *************** MUTATION ***************

/**
 * Creates a new student.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The created student document.
 */
async function CreateStudent(_, { input }) {
  try {
    const { error, value } = studentSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await CreateStudentHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    CreateStudent,
  },
};
