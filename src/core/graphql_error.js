// *************** IMPORT LIBRARY ***************
const { GraphQLError } = require("graphql");
const Joi = require("joi");

// *************** NORMALIZE GQL ERROR ***************
/**
 * Catches and normalizes errors into a standard GraphQL error format.
 *
 * @param {Error} err - The caught error (Joi, AppError, or generic).
 * @throws {GraphQLError} A formatted GraphQL error.
 */
function NormalizeGqlError(err) {
  if (err instanceof GraphQLError) throw err;
  if (Joi.isError(err)) {
    throw new GraphQLError(err.message, {
      extensions: { code: "VALIDATION_ERROR", status: 400 },
    });
  }
  if (err.isOperational) {
    throw new GraphQLError(err.description, {
      extensions: { code: err.code, status: err.statusCode },
    });
  }
  throw new GraphQLError("Internal server error", {
    extensions: { code: "INTERNAL_ERROR", status: 500 },
  });
}

// *************** EXPORT MODULE ***************
module.exports = { NormalizeGqlError };
