// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** GLOBAL VARIABLES ***************
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

// *************** VALIDATION SCHEMA FOR STUDENT ***************
const studentSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  studentNumber: Joi.string().required(),
});

// *************** VALIDATION SCHEMA FOR GET STUDENTS BY ACADEMIC YEAR ***************
const getStudentsByAcademicYearSchema = Joi.object({
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow("").optional(),
});

// *************** EXPORT MODULE ***************
module.exports = { studentSchema, GetStudentsByAcademicYearSchema: getStudentsByAcademicYearSchema };
