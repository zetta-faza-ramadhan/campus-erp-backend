// *************** IMPORT LIBRARY ***************
const Joi = require('joi');

// *************** IMPORT VALIDATOR ***************
const { ValidateInputWithJoi } = require('./joi.validator');
const { StandingSubjectSchema } = require('../../features/academic/grading/grading.validator');

// *************** VALIDATION SCHEMA FOR WEBHOOK DISPATCH ***************

// *************** A single computed academic standing
const StandingSchema = Joi.object({
  student_id: Joi.any().required(),
  academic_year_id: Joi.any().required(),
  block_id: Joi.any().required(),
  block_average: Joi.number().min(0).max(100).required(),
  block_status: Joi.string().valid('PASS', 'FAIL', 'RETAKE').required(),
  subjects: Joi.array().items(StandingSubjectSchema).required(),
});

// *************** The full dispatch payload: standings + warehouse endpoint
const DispatchAcademicStandingsSchema = Joi.object({
  standingsArray: Joi.array().items(StandingSchema).min(1).required(),
  warehouseUrl: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
});

// *************** VALIDATE AND SANITIZE: WEBHOOK DISPATCH ***************
/**
 * Validates and sanitizes the webhook dispatch inputs.
 *
 * @param {Object} input - Raw dispatch inputs.
 * @param {Array<Object>} input.standingsArray - The computed standings to dispatch.
 * @param {string} input.warehouseUrl - The configured warehouse endpoint.
 * @returns {Object} Sanitized `{ standingsArray, warehouseUrl }`.
 */
function ValidateAndSanitizeDispatchAcademicStandings(input) {
  return ValidateInputWithJoi({
    schema: DispatchAcademicStandingsSchema,
    payload: input,
  });
}

// *************** EXPORT MODULE ***************
module.exports = { ValidateAndSanitizeDispatchAcademicStandings };
