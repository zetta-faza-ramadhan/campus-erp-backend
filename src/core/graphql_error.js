// *************** IMPORT LIBRARY ***************
const { GraphQLError } = require('graphql');
const Joi = require('joi');

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
      extensions: { code: 'VALIDATION_ERROR', status: 400 },
    });
  }
  if (err.isOperational) {
    throw new GraphQLError(err.description, {
      extensions: { code: err.code, status: err.statusCode },
    });
  }
  throw new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_ERROR', status: 500 },
  });
}

// *************** NORMALIZE CLIENT ERRORS ***************
const CLIENT_ERROR_CODES = new Set(['BAD_USER_INPUT', 'GRAPHQL_VALIDATION_FAILED']);

/**
 * Apollo Server plugin lifecycle hook invoked when a request starts.
 *
 * @returns {Promise<Object>} Object containing the willSendResponse hook.
 */
async function RequestDidStart() {
  return {
    willSendResponse: WillSendResponse,
  };
}

/**
 * Apollo Server plugin lifecycle hook that stamps HTTP status 400 on
 * client-side GraphQL errors (BAD_USER_INPUT, GRAPHQL_VALIDATION_FAILED)
 * before the response is sent, so clients get a consistent status code.
 *
 * @param {Object} lifecycle - Apollo request lifecycle context.
 * @param {Object} lifecycle.response - The outgoing HTTP response body.
 */
async function WillSendResponse({ response }) {
  NormalizeClientErrors(response.body);
}

/**
 * Creates the Apollo server plugin object that stamps HTTP status 400 on
 * client-side GraphQL errors (BAD_USER_INPUT, GRAPHQL_VALIDATION_FAILED) so
 * clients can rely on a consistent status code.
 *
 * @returns {Object} Apollo plugin object with a requestDidStart lifecycle hook.
 */
function CreateNormalizeClientError() {
  return {
    requestDidStart: RequestDidStart,
  };
}

/**
 * Stamps a consistent HTTP status on client-caused GraphQL errors.
 * GraphQL variable coercion and validation failures carry no `status`
 * extension; this aligns them with NormalizeGqlError's contract.
 *
 * @param {Object} body - Apollo HTTP response body ({ kind: "single", singleResult }).
 */
function NormalizeClientErrors(body) {
  if (!body || body.kind !== 'single' || !body.singleResult.errors) return;
  for (const err of body.singleResult.errors) {
    if (!err.extensions || err.extensions.status !== undefined) continue;
    if (CLIENT_ERROR_CODES.has(err.extensions.code)) {
      err.extensions.status = 400;
    }
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  NormalizeGqlError,
  NormalizeClientErrors,
  CreateNormalizeClientError,
};
