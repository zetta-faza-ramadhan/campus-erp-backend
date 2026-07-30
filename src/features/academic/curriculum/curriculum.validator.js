// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

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

// *************** VALIDATION SCHEMA FOR SUBJECT ***************
const subjectSchema = Joi.object({
  name: Joi.string().required(),
  block_id: Joi.string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

// *************** VALIDATION SCHEMA FOR TEST ***************
const testSchema = Joi.object({
  name: Joi.string().required(),
  subject_id: Joi.string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .required(),
  weightage: Joi.number().greater(0).max(100).required(),
  grading_rules: Joi.array().items(gradingRuleSchema).required(),
});

// *************** EXPORT MODULE ***************
module.exports = {
  blockSchema,
  subjectSchema,
  testSchema,
};
