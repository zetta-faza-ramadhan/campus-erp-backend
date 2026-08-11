// *************** IMPORT LIBRARY ***************
const DataLoader = require("dataloader");

// *************** IMPORT MODULE ***************
const AcademicYearModel = require("../features/academic/enrollment/academic_year.model");

// *************** GLOBAL VARIABLES ***************
// *************** Reusable field selection to avoid over-fetching and name mismatches in loaders.
const ACADEMIC_YEAR_FIELDS =
  "name start_date end_date status block_ids student_ids deleted_at created_at updated_at";

// *************** LOADER ***************
/**
 * Batch-loads AcademicYear documents by their IDs to resolve the N+1 problem.
 *
 * The batch function receives an array of unique academic_year_ids, issues a
 * single $in query, then returns one result per input key — preserving the
 * exact ordering DataLoader requires (null for missing keys).
 *
 * @returns {DataLoader<string, Object|null>} A DataLoader instance for AcademicYear.
 */
function CreateAcademicYearLoader() {
  return new DataLoader(
    async (keys) => {
      // *************** Query all requested years in a single round-trip
      const years = await AcademicYearModel.find({
        _id: { $in: keys },
        deleted_at: null,
      })
        .select(ACADEMIC_YEAR_FIELDS)
        .lean();

      // *************** Build an index for O(1) lookup by stringified _id
      const yearMap = new Map(years.map((year) => [String(year._id), year]));

      // *************** Return results aligned 1:1 with the requested keys
      return keys.map((key) => yearMap.get(String(key)) ?? null);
    },
    { cacheKeyFn: (key) => String(key) },
  );
}

// *************** EXPORT MODULE ***************
module.exports = { CreateAcademicYearLoader };
