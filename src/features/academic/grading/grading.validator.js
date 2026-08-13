// *************** IMPORT LIBRARY ***************
const Joi = require('joi');

// *************** IMPORT MODULE ***************
const AppError = require('../../../core/error');

// *************** IMPORT VALIDATOR ***************
const { OBJECT_ID_PATTERN } = require('../../../core/validators');
const { ValidateInputWithJoi } = require('../../../shared/validator/joi.validator');

// *************** GLOBAL VARIABLES ***************
const MAX_AGGREGATION_STUDENTS = 500;

// *************** VALIDATION SCHEMA FOR GRADING ***************

/**
 * Joi custom validator: rejects scores with more than 2 decimal places
 * to prevent precision drift before the aggregation worker processes them.
 *
 * @param {number} value - The raw score to validate.
 * @param {Object} helpers - Joi validation helper context.
 * @returns {number|Object} The validated value, or a Joi error via helpers.message().
 */
function ValidateScorePrecision(value, helpers) {
  if (Math.round(value * 100) / 100 !== value) {
    return helpers.message('Score must have at most 2 decimal places');
  }
  return value;
}

// *************** Rejects scores with more than 2 decimal places (precision drift)
const ScoreSchema = Joi.number().min(0).max(100).custom(ValidateScorePrecision).required();

const TestGradeSchema = Joi.object({
  test_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  grades: Joi.array()
    .items(
      Joi.object({
        student_id: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
        score: ScoreSchema,
      }),
    )
    .unique('student_id')
    .min(1)
    .max(200)
    .required(),
});

const SubmitTestGradesSchema = Joi.object({
  academic_year_id: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  test_grades: Joi.array().items(TestGradeSchema).unique('test_id').min(1).max(50).required(),
});

// *************** VALIDATE AND SANITIZE: GRADING ***************
/**
 * Validates and sanitizes SubmitTestGrades input.
 *
 * @param {Object} input - Raw input from the client.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeSubmitTestGrades(input) {
  return ValidateInputWithJoi({
    schema: SubmitTestGradesSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR SPAWN GRADE AGGREGATOR ***************
const SpawnGradeAggregatorSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().regex(OBJECT_ID_PATTERN).lowercase()).min(1).max(MAX_AGGREGATION_STUDENTS).required(),
  testId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
});

// *************** VALIDATE AND SANITIZE: SPAWN GRADE AGGREGATOR ***************
/**
 * Validates and sanitizes SpawnGradeAggregator input.
 *
 * @param {Object} input - Raw input from the caller.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeSpawnGradeAggregator(input) {
  return ValidateInputWithJoi({
    schema: SpawnGradeAggregatorSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR AGGREGATION PARAMS ***************
const AggregationParamsSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().regex(OBJECT_ID_PATTERN).lowercase()).min(1).max(MAX_AGGREGATION_STUDENTS).unique().required(),
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
  hierarchy: Joi.object({
    block: Joi.object({
      _id: Joi.any().required(),
      grading_rules: Joi.array().required(),
    }).required(),
    subjects: Joi.array().required(),
    testIds: Joi.array().optional(),
  }).optional(),
  grades: Joi.array().optional(),
  gradeByKey: Joi.any().optional(),
});

// *************** VALIDATE AND SANITIZE: AGGREGATION PARAMS ***************
/**
 * Validates and sanitizes the shared aggregation parameters used by
 * BuildStudentStanding, BuildBulkWriteOperations, and RunGradeAggregation.
 *
 * @param {Object} input - Raw aggregation params.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeAggregationParams(input) {
  return ValidateInputWithJoi({
    schema: AggregationParamsSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR NORMALIZE STANDING LABEL ***************
const NormalizeStandingLabelSchema = Joi.string().trim().min(1).required();

// *************** VALIDATE AND SANITIZE: NORMALIZE STANDING LABEL ***************
/**
 * Validates and sanitizes NormalizeStandingLabel input.
 *
 * @param {string} input - Raw label input.
 * @returns {string} Sanitized and validated label.
 */
function ValidateAndSanitizeNormalizeStandingLabel(input) {
  return ValidateInputWithJoi({
    schema: NormalizeStandingLabelSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR EVALUATE STANDING ***************
const EvaluateStandingSchema = Joi.object({
  score: Joi.number().required(),
  gradingRules: Joi.array().optional(),
});

// *************** VALIDATE AND SANITIZE: EVALUATE STANDING ***************
/**
 * Validates and sanitizes EvaluateStanding input.
 *
 * @param {Object} input - Raw evaluation params.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeEvaluateStanding(input) {
  return ValidateInputWithJoi({
    schema: EvaluateStandingSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR ROUND TO TWO DECIMALS ***************
const RoundToTwoDecimalsSchema = Joi.number().required();

// *************** VALIDATE AND SANITIZE: ROUND TO TWO DECIMALS ***************
/**
 * Validates and sanitizes RoundToTwoDecimals input.
 *
 * @param {number} input - Raw numeric value.
 * @returns {number} Sanitized and validated value.
 */
function ValidateAndSanitizeRoundToTwoDecimals(input) {
  return ValidateInputWithJoi({
    schema: RoundToTwoDecimalsSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR BUILD GRADE KEY ***************
const BuildGradeKeySchema = Joi.object({
  studentId: Joi.any().required(),
  testId: Joi.any().required(),
});

// *************** VALIDATE AND SANITIZE: BUILD GRADE KEY ***************
/**
 * Validates and sanitizes BuildGradeKey input.
 *
 * @param {Object} input - Raw key params.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeBuildGradeKey(input) {
  return ValidateInputWithJoi({
    schema: BuildGradeKeySchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR LOAD CURRICULUM HIERARCHY ***************
const LoadCurriculumHierarchySchema = Joi.string().regex(OBJECT_ID_PATTERN).required();

// *************** VALIDATE AND SANITIZE: LOAD CURRICULUM HIERARCHY ***************
/**
 * Validates and sanitizes LoadCurriculumHierarchy input.
 *
 * @param {string} input - Raw testId.
 * @returns {string} Sanitized and validated testId.
 */
function ValidateAndSanitizeLoadCurriculumHierarchy(input) {
  return ValidateInputWithJoi({
    schema: LoadCurriculumHierarchySchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR REPORT CARD PARAMS ***************
const ReportCardParamsSchema = Joi.object({
  academicYearId: Joi.string().regex(OBJECT_ID_PATTERN).required(),
  studentId: Joi.string().regex(OBJECT_ID_PATTERN).lowercase().required(),
});

// *************** VALIDATION SCHEMA FOR MAP TEST TO TEMPLATE ***************
const MapTestToTemplateSchema = Joi.object({
  test: Joi.object({
    test_id: Joi.any().required(),
    total_mark: Joi.number().allow(null).optional(),
    test_status: Joi.string().allow(null).optional(),
  }).required(),
  testNameById: Joi.any().required(),
});

// *************** VALIDATE AND SANITIZE: MAP TEST TO TEMPLATE ***************
/**
 * Validates and sanitizes MapTestToTemplate input.
 *
 * @param {Object} input - Raw template mapping params.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeMapTestToTemplate(input) {
  return ValidateInputWithJoi({
    schema: MapTestToTemplateSchema,
    payload: input,
  });
}

// *************** VALIDATION SCHEMA FOR MAP SUBJECT TO TEMPLATE ***************
const MapSubjectToTemplateSchema = Joi.object({
  subject: Joi.object({
    subject_id: Joi.any().required(),
    subject_average: Joi.number().allow(null).optional(),
    subject_status: Joi.string().allow(null).optional(),
    tests: Joi.array().optional(),
  }).required(),
  subjectNameById: Joi.any().required(),
  testNameById: Joi.any().required(),
});

// *************** VALIDATE AND SANITIZE: MAP SUBJECT TO TEMPLATE ***************
/**
 * Validates and sanitizes MapSubjectToTemplate input.
 *
 * @param {Object} input - Raw template mapping params.
 * @returns {Object} Sanitized and validated input.
 */
function ValidateAndSanitizeMapSubjectToTemplate(input) {
  return ValidateInputWithJoi({
    schema: MapSubjectToTemplateSchema,
    payload: input,
  });
}

// *************** VALIDATE AND SANITIZE: REPORT CARD PARAMS ***************
/**
 * Validates and sanitizes the report-card route parameters for the REST
 * endpoint. Unlike the GraphQL validators, failures surface as a 400
 * AppError so the Express error path can respond without a GraphQL error.
 *
 * @param {Object} input - Raw route parameters from the request.
 * @param {string} input.academicYearId - The academic year id.
 * @param {string} input.studentId - The student id.
 * @returns {Object} Sanitized and validated route parameters.
 * @throws {AppError} 400 - Malformed academic year or student id.
 */
function ValidateAndSanitizeReportCardParams(input) {
  const { error, value } = ReportCardParamsSchema.validate(input);
  if (error) {
    throw new AppError('INVALID_PARAMETER', 400, 'Invalid academic year or student id.');
  }
  return value;
}

// *************** EXPORT MODULE ***************
module.exports = {
  MAX_AGGREGATION_STUDENTS,
  SubmitTestGradesSchema,
  ValidateAndSanitizeSubmitTestGrades,
  SpawnGradeAggregatorSchema,
  ValidateAndSanitizeSpawnGradeAggregator,
  AggregationParamsSchema,
  ValidateAndSanitizeAggregationParams,
  ValidateAndSanitizeNormalizeStandingLabel,
  ValidateAndSanitizeEvaluateStanding,
  ValidateAndSanitizeRoundToTwoDecimals,
  ValidateAndSanitizeBuildGradeKey,
  ValidateAndSanitizeLoadCurriculumHierarchy,
  ReportCardParamsSchema,
  ValidateAndSanitizeReportCardParams,
  MapTestToTemplateSchema,
  ValidateAndSanitizeMapTestToTemplate,
  MapSubjectToTemplateSchema,
  ValidateAndSanitizeMapSubjectToTemplate,
};
