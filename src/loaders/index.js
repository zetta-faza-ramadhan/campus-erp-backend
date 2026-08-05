// *************** IMPORT LOADERS ***************
const { CreateAcademicYearLoader } = require("./academic_year.loader");

// *************** LOADER ***************
/**
 * Creates all per-request DataLoader instances.
 * Each request gets a fresh set of loaders to prevent stale cache and memory leaks.
 *
 * @returns {Object} An object containing all DataLoader instances.
 */
function CreateAllLoaders() {
  return {
    academicYearLoader: CreateAcademicYearLoader(),
  };
}

// *************** EXPORT MODULE ***************
module.exports = { CreateAllLoaders };
