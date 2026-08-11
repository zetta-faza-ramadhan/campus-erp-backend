// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");

/**
 * Validates the shared aggregation parameters used by BuildStudentStanding,
 * BuildBulkWriteOperations, and RunGradeAggregation.
 *
 * @param {Object} params - The aggregation params to validate.
 * @param {Array<string>} params.studentIds - Non-empty array of student IDs.
 * @param {string} params.academicYearId - The academic year ObjectId.
 * @param {Object} [params.hierarchy] - The loaded curriculum hierarchy.
 * @param {Array<Object>} [params.grades] - All grades for the block.
 * @param {Map<string, Object>} [params.gradeByKey] - Grades keyed by BuildGradeKey.
 * @returns {Object} The validated params object.
 * @throws {AppError} 400 - Any required param is missing or malformed.
 */
function ValidateAggregationParams({ studentIds, academicYearId, hierarchy, grades, gradeByKey }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new AppError("INVALID_STUDENT_IDS", 400, "studentIds must be a non-empty array.");
  }
  if (!academicYearId) {
    throw new AppError("INVALID_ACADEMIC_YEAR_ID", 400, "academicYearId is required.");
  }
  if (hierarchy !== undefined && hierarchy !== null) {
    if (!hierarchy.block || !Array.isArray(hierarchy.subjects)) {
      throw new AppError("INVALID_HIERARCHY", 400, "hierarchy must contain block and subjects array.");
    }
  }
  if (grades !== undefined && !Array.isArray(grades)) {
    throw new AppError("INVALID_GRADES", 400, "grades must be an array.");
  }
  if (gradeByKey !== undefined && !(gradeByKey instanceof Map)) {
    throw new AppError("INVALID_GRADE_KEY_MAP", 400, "gradeByKey must be a Map.");
  }
  return { studentIds, academicYearId, hierarchy, grades, gradeByKey };
}

// *************** EXPORT MODULE ***************
module.exports = { ValidateAggregationParams };
