// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require('../../../core/graphql_error');

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeCreateStudent } = require('./student.validator');

// *************** IMPORT HELPER FUNCTION ***************
const { CreateStudentHelper } = require('./student.helper');

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
    const value = ValidateAndSanitizeCreateStudent(input);
    const result = await CreateStudentHelper({
      firstName: value.first_name,
      lastName: value.last_name,
      email: value.email,
      studentNumber: value.student_number,
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
