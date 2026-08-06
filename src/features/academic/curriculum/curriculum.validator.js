// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const {
  OBJECT_ID_PATTERN,
  objectIdSchema,
} = require("../../../core/validators");
const {
  ValidateInputWithJoi,
} = require("../../../shared/validator/joi.validator");

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

// *************** VALIDATE AND SANITIZE: BLOCK ***************
/**
 * Validates and sanitizes CreateBlock input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeCreateBlock(input) {
  return ValidateInputWithJoi({ schema: blockSchema, payload: input });
}

/**
 * Validates and sanitizes UpdateBlock input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeUpdateBlock(input) {
  return ValidateInputWithJoi({ schema: updateBlockSchema, payload: input });
}

/**
 * Validates and sanitizes a block ObjectId.
 *
 * @param {string} id - The block ID to validate.
 * @returns {string} The validated block ID.
 */
function ValidateAndSanitizeBlockId(id) {
  return ValidateInputWithJoi({ schema: objectIdSchema, payload: id });
}

// *************** VALIDATE AND SANITIZE: SUBJECT ***************
/**
 * Validates and sanitizes CreateSubject input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeCreateSubject(input) {
  return ValidateInputWithJoi({ schema: subjectSchema, payload: input });
}

/**
 * Validates and sanitizes UpdateSubject input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeUpdateSubject(input) {
  return ValidateInputWithJoi({ schema: updateSubjectSchema, payload: input });
}

/**
 * Validates and sanitizes a subject ObjectId.
 *
 * @param {string} id - The subject ID to validate.
 * @returns {string} The validated subject ID.
 */
function ValidateAndSanitizeSubjectId(id) {
  return ValidateInputWithJoi({ schema: objectIdSchema, payload: id });
}

// *************** VALIDATE AND SANITIZE: TEST ***************
/**
 * Validates and sanitizes CreateTest input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeCreateTest(input) {
  return ValidateInputWithJoi({ schema: testSchema, payload: input });
}

/**
 * Validates and sanitizes UpdateTest input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeUpdateTest(input) {
  return ValidateInputWithJoi({ schema: updateTestSchema, payload: input });
}

/**
 * Validates and sanitizes a test ObjectId.
 *
 * @param {string} id - The test ID to validate.
 * @returns {string} The validated test ID.
 */
function ValidateAndSanitizeTestId(id) {
  return ValidateInputWithJoi({ schema: objectIdSchema, payload: id });
}

// *************** EXPORT MODULE ***************
module.exports = {
  blockSchema,
  updateBlockSchema,
  subjectSchema,
  updateSubjectSchema,
  testSchema,
  updateTestSchema,
  objectIdSchema,
  ValidateAndSanitizeCreateBlock,
  ValidateAndSanitizeUpdateBlock,
  ValidateAndSanitizeBlockId,
  ValidateAndSanitizeCreateSubject,
  ValidateAndSanitizeUpdateSubject,
  ValidateAndSanitizeSubjectId,
  ValidateAndSanitizeCreateTest,
  ValidateAndSanitizeUpdateTest,
  ValidateAndSanitizeTestId,
};
