// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** GLOBAL VARIABLES ***************
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

// *************** VALIDATION SCHEMA FOR ENROLLMENT ***************
const enrollStudentsSchema = Joi.object({
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  studentIds: Joi.array()
    .items(Joi.string().regex(OBJECT_ID_PATTERN))
    .min(1)
    .required(),
});

// *************** EXPORT MODULE ***************
module.exports = { enrollStudentsSchema };
