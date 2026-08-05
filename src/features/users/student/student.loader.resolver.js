// *************** FIELD RESOLVERS ***************
/**
 * Resolves the AcademicYear documents a student belongs to.
 *
 * @param {Object} parent - The Student parent document.
 * @param {Object} _ - Unused query arguments.
 * @param {Object} context - GraphQL context containing per-request loaders.
 * @returns {Promise<Array<Object|null>>} Batch-loaded academic years in order.
 */
function AcademicYearsFieldResolver(parent, _, context) {
  return context.loaders.academicYearLoader
    .loadMany(parent.academic_year_ids)
    .then((years) => years.filter(Boolean));
}

// *************** EXPORT MODULE ***************
module.exports = { AcademicYearsFieldResolver };
