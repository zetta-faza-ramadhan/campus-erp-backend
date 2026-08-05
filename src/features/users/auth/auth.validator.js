// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** VALIDATION SCHEMA FOR LOGIN ***************
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// *************** EXPORT MODULE ***************
module.exports = { loginSchema };
