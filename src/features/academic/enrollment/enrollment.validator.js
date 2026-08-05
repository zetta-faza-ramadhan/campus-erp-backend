// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const { OBJECT_ID_PATTERN } = require("../../../core/validators");

// *************** VALIDATION SCHEMA FOR ENROLLMENT ***************
const enrollStudentsSchema = Joi.object({
  academic_year_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  student_ids: Joi.array()
    .items(Joi.string().regex(OBJECT_ID_PATTERN))
    .min(1)
    .required(),
});

// *************** EXPORT MODULE ***************
module.exports = { enrollStudentsSchema };
