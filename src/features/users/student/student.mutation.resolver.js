// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeCreateStudent } = require("./student.validator");

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
    ValidateAndSanitizeCreateStudent(input);
    const result = await CreateStudentHelper({
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      studentNumber: input.student_number,
    });
    return result;
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
