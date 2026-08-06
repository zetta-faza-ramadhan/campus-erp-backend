// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeBlockId,
  ValidateAndSanitizeSubjectId,
} = require("./curriculum.validator");

// *************** IMPORT HELPER FUNCTION ***************
const curriculumHelper = require("./curriculum.helper");

// *************** FIELD RESOLVERS ***************
/**
 * Converts the MongoDB ObjectId _id to a string for the GraphQL ID scalar.
 *
 * @param {Object} parent - The parent document.
 * @returns {string} The stringified _id.
 */
function IdFieldResolver(parent) {
  return parent._id.toString();
}

// *************** QUERY ***************

/**
 * Retrieves all blocks.
 *
 * @returns {Promise<Array>} List of block documents.
 */
async function GetBlocks() {
  try {
    const result = await curriculumHelper.GetBlocksHelper();
    return result;
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Retrieves all subjects belonging to a block.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing block_id.
 * @returns {Promise<Array>} List of subject documents.
 */
async function GetSubjects(_, { block_id }) {
  try {
    const value = ValidateAndSanitizeBlockId(block_id);
    const result = await curriculumHelper.GetSubjectsHelper(value);
    return result;
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Retrieves all tests belonging to a subject.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing subject_id.
 * @returns {Promise<Array>} List of test documents.
 */
async function GetTests(_, { subject_id }) {
  try {
    const value = ValidateAndSanitizeSubjectId(subject_id);
    const result = await curriculumHelper.GetTestsHelper(value);
    return result;
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Query: {
    GetBlocks,
    GetSubjects,
    GetTests,
  },
  Block: { _id: IdFieldResolver },
  Subject: { _id: IdFieldResolver },
  Test: { _id: IdFieldResolver },
};
