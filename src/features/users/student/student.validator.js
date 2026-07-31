// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** VALIDATION SCHEMA FOR STUDENT ***************
const studentSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  student_number: Joi.string().required(),
});

// *************** EXPORT MODULE ***************
module.exports = { studentSchema };
