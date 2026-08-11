// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const { OBJECT_ID_PATTERN } = require("../../../core/validators");
const {
  ValidateInputWithJoi,
} = require("../../../shared/validator/joi.validator");

// *************** VALIDATION SCHEMA FOR GRADING ***************
const SubmitTestGradesSchema = Joi.object({
  academic_year_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  test_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  grades: Joi.array()
    .items(
      Joi.object({
        student_id: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
        score: Joi.number().min(0).max(100).required(),
      }),
    )
    .unique("student_id")
    .min(1)
    .required(),
});

// *************** VALIDATE AND SANITIZE: GRADING ***************
/**
 * Validates and sanitizes SubmitTestGrades input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeSubmitTestGrades(input) {
  return ValidateInputWithJoi({
    schema: SubmitTestGradesSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR SPAWN GRADE AGGREGATOR ***************
const SpawnGradeAggregatorSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().regex(OBJECT_ID_PATTERN).lowercase()).min(1).required(),
  testId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
});

// *************** VALIDATE AND SANITIZE: SPAWN GRADE AGGREGATOR ***************
/**
 * Validates and sanitizes SpawnGradeAggregator input.
 *
 * @param {Object} input - Raw input from the caller.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeSpawnGradeAggregator(input) {
  return ValidateInputWithJoi({
    schema: SpawnGradeAggregatorSchema,
    payload: input,
  });
}

// *************** EXPORT MODULE ***************
module.exports = {
  SubmitTestGradesSchema,
  ValidateAndSanitizeSubmitTestGrades,
  SpawnGradeAggregatorSchema,
  ValidateAndSanitizeSpawnGradeAggregator,
};
