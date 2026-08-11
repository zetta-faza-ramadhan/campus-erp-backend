// *************** IMPORT LIBRARY ***************
const Joi = require('joi');

// *************** IMPORT VALIDATOR ***************
const { OBJECT_ID_PATTERN } = require('../../../core/validators');
const { ValidateInputWithJoi } = require('../../../shared/validator/joi.validator');

// *************** VALIDATION SCHEMA FOR ENROLLMENT ***************
const EnrollStudentsSchema = Joi.object({
  academic_year_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  student_ids: Joi.array().items(Joi.string().regex(OBJECT_ID_PATTERN)).min(1).max(500).required(),
});

// *************** VALIDATE AND SANITIZE: ENROLLMENT ***************
/**
 * Validates and sanitizes EnrollStudentsToYear input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeEnrollStudents(input) {
  return ValidateInputWithJoi({ schema: EnrollStudentsSchema, payload: input });
}

// *************** EXPORT MODULE ***************
module.exports = { EnrollStudentsSchema, ValidateAndSanitizeEnrollStudents };
