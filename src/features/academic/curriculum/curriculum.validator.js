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

// *************** VALIDATION SCHEMA FOR BLOCK ***************
const blockSchema = Joi.object({
  name: Joi.string().required(),
  academic_year: Joi.string().required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateBlockSchema = Joi.object({
  id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  academic_year: Joi.string(),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).min(1);

// *************** VALIDATION SCHEMA FOR SUBJECT ***************
const subjectSchema = Joi.object({
  name: Joi.string().required(),
  block_id: Joi.string()
    .regex(OBJECT_ID_PATTERN)
    .required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateSubjectSchema = Joi.object({
  id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  block_id: Joi.string().regex(OBJECT_ID_PATTERN),
  weightage: Joi.number().greater(0).max(100),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).min(1);

// *************** VALIDATION SCHEMA FOR TEST ***************
const testSchema = Joi.object({
  name: Joi.string().required(),
  subject_id: Joi.string()
    .regex(OBJECT_ID_PATTERN)
    .required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

const updateTestSchema = Joi.object({
  id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  name: Joi.string(),
  subject_id: Joi.string().regex(OBJECT_ID_PATTERN),
  weightage: Joi.number().greater(0).max(100),
  grading_rules: Joi.array().items(gradingRuleSchema),
}).min(1);

// *************** EXPORT MODULE ***************
module.exports = {
  blockSchema, updateBlockSchema,
  subjectSchema, updateSubjectSchema,
  testSchema, updateTestSchema,
};
