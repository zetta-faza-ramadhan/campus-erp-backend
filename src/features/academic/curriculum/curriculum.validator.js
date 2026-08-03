// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** GLOBAL VARIABLES ***************
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

// *************** VALIDATION SCHEMA FOR GRADINGRULE ***************
const gradingRuleSchema = Joi.object({
  label: Joi.string().required(),
  operator: Joi.string().valid(">", ">=", "<", "<=", "==").required(),
  threshold: Joi.number().required(),
});

// *************** REJECT NO-OP UPDATES ***************
/**
 * Rejects an update payload that only carries _id and no settable field.
 *
 * @param {Object} value - The validated input payload.
 * @param {Object} helpers - Joi custom validation context.
 * @returns {Object} The unchanged value.
 * @throws {Error} Validation error when no updatable field is present.
 */
function requireAtLeastOneNonIdField(value, helpers) {
  const keys = Object.keys(value).filter((key) => key !== "_id");
  if (keys.length === 0) {
    return helpers.message("At least one update field must be provided.");
  }
  return value;
}

// *************** VALIDATION SCHEMA FOR BLOCK ***************
const blockSchema = Joi.object({
  name: Joi.string().required(),
  academic_year: Joi.string().required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateBlockSchema = Joi.object({
  _id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  academic_year: Joi.string(),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).custom(requireAtLeastOneNonIdField);

// *************** VALIDATION SCHEMA FOR SUBJECT ***************
const subjectSchema = Joi.object({
  name: Joi.string().required(),
  block_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateSubjectSchema = Joi.object({
  _id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  block_id: Joi.string().regex(OBJECT_ID_PATTERN),
  weightage: Joi.number().greater(0).max(100),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).custom(requireAtLeastOneNonIdField);

// *************** VALIDATION SCHEMA FOR TEST ***************
const testSchema = Joi.object({
  name: Joi.string().required(),
  subject_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateTestSchema = Joi.object({
  _id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  subject_id: Joi.string().regex(OBJECT_ID_PATTERN),
  weightage: Joi.number().greater(0).max(100),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).custom(requireAtLeastOneNonIdField);

// *************** REUSABLE OBJECTID VALIDATION ***************
const objectIdSchema = Joi.string().regex(OBJECT_ID_PATTERN).required();

// *************** EXPORT MODULE ***************
module.exports = {
  blockSchema,
  updateBlockSchema,
  subjectSchema,
  updateSubjectSchema,
  testSchema,
  updateTestSchema,
  objectIdSchema,
};
