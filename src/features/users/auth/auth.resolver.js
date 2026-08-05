// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const { loginSchema } = require("./auth.validator");

// *************** IMPORT HELPER FUNCTION ***************
const { LoginHelper } = require("./auth.helper");

// *************** MUTATION ***************

/**
 * Authenticates a user and returns a JWT.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<string>} JWT token.
 */
async function Login(_, { input }) {
  try {
    const { error, value } = loginSchema.validate(input);
    if (error) NormalizeGqlError(error);
    const { email, password } = value;
    return await LoginHelper({ email, password });
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    Login,
  },
};
