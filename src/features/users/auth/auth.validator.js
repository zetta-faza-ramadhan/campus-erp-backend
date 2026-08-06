// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const { ValidateInputWithJoi } = require("../../../shared/validator/joi.validator");

// *************** VALIDATION SCHEMA FOR LOGIN ***************
const LoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// *************** VALIDATE AND SANITIZE LOGIN ***************
/**
 * Validates and sanitizes login input against the login schema.
 *
 * @param {Object} input - Raw login input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeLogin(input) {
  return ValidateInputWithJoi({
    schema: LoginSchema,
    payload: input,
  });
}

// *************** EXPORT MODULE ***************
module.exports = { LoginSchema, ValidateAndSanitizeLogin };
