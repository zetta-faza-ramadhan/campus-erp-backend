// *************** IMPORT LIBRARY ***************
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const { OBJECT_ID_PATTERN } = require("../../../core/validators");
const {
  ValidateInputWithJoi,
} = require("../../../shared/validator/joi.validator");

// *************** VALIDATION SCHEMA FOR STUDENT ***************
const StudentSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  student_number: Joi.string().required(),
});

// *************** VALIDATION SCHEMA FOR GET STUDENTS BY ACADEMIC YEAR ***************
const GetStudentsByAcademicYearSchema = Joi.object({
  academic_year_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow("").optional(),
});

// *************** VALIDATE AND SANITIZE: STUDENT ***************
/**
 * Validates and sanitizes CreateStudent input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeCreateStudent(input) {
  return ValidateInputWithJoi({ schema: StudentSchema, payload: input });
}

/**
 * Validates and sanitizes GetStudentsByAcademicYear input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeGetStudentsByAcademicYear(input) {
  return ValidateInputWithJoi({
    schema: GetStudentsByAcademicYearSchema,
    payload: input,
  });
}

// *************** EXPORT MODULE ***************
module.exports = {
  StudentSchema,
  GetStudentsByAcademicYearSchema,
  ValidateAndSanitizeCreateStudent,
  ValidateAndSanitizeGetStudentsByAcademicYear,
};
