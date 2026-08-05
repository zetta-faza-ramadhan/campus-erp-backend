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

// *************** NORMALIZE CLIENT ERRORS ***************
const CLIENT_ERROR_CODES = new Set(["BAD_USER_INPUT", "GRAPHQL_VALIDATION_FAILED"]);

/**
 * Stamps a consistent HTTP status on client-caused GraphQL errors.
 * GraphQL variable coercion and validation failures carry no `status`
 * extension; this aligns them with NormalizeGqlError's contract.
 *
 * @param {Object} body - Apollo HTTP response body ({ kind: "single", singleResult }).
 */
function NormalizeClientErrors(body) {
  if (!body || body.kind !== "single" || !body.singleResult.errors) return;
  for (const err of body.singleResult.errors) {
    if (!err.extensions || err.extensions.status !== undefined) continue;
    if (CLIENT_ERROR_CODES.has(err.extensions.code)) {
      err.extensions.status = 400;
    }
  }
}

// *************** EXPORT MODULE ***************
module.exports = { NormalizeGqlError, NormalizeClientErrors };
