// *************** IMPORT LIBRARY ***************
const { GraphQLError } = require('graphql');
const Joi = require('joi');

// *************** IMPORT MODULE ***************
const AppError = require('./error');

// *************** RE-THROW HELPER ERROR ***************
/**
 * Central error guard for feature helpers.
 *
 * Re-throws every error the transport layer knows how to normalize
 * (AppError, GraphQLError, Joi validation, Mongo E11000 duplicate key)
 * so upstream logic can still act on it (e.g. E11000 → 409 in
 * CreateStudent). Only truly unexpected errors are wrapped into a
 * contextual INTERNAL_ERROR AppError instead.
 *
 * @param {Error} err - The error caught by a helper's try/catch.
 * @param {string} action - Verb phrase describing the failing operation
 *   (e.g. "validating subject weightage" → "… while validating subject weightage.").
 * @throws {AppError|GraphQLError} The original error when recognized, or a
 *   new AppError("INTERNAL_ERROR", 500, "Unexpected internal error while {action}.")
 *   keeping the original error as its `cause`.
 */
function ReThrowHelperError(err, action) {
  if (err instanceof AppError || err instanceof GraphQLError || Joi.isError(err) || err?.code === 11000) {
    throw err;
  }
  throw new AppError('INTERNAL_ERROR', 500, `Unexpected internal error while ${action}.`, { cause: err });
}

// *************** EXPORT MODULE ***************
module.exports = { ReThrowHelperError };
