// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require('../../core/graphql_error');

// *************** VALIDATE INPUT WITH JOI ***************
/**
 * Validates a payload against a Joi schema and normalizes errors.
 * Returns the sanitized value on success; throws a formatted
 * GraphQL error on failure.
 *
 * @param {Object} options - Validation options.
 * @param {Object} options.schema - The Joi schema to validate against.
 * @param {*} options.payload - The input payload to validate.
 * @returns {*} The sanitized value if validation passes.
 */
function ValidateInputWithJoi({ schema, payload }) {
  const { error, value } = schema.validate(payload);
  if (error) NormalizeGqlError(error);
  return value;
}

// *************** EXPORT MODULE ***************
module.exports = { ValidateInputWithJoi };
