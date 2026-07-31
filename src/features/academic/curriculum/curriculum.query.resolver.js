// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");
const { objectIdSchema } = require("./curriculum.validator");
const curriculumHelper = require("./curriculum.helper");

// *************** FIELD RESOLVERS ***************
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
    return await curriculumHelper.GetBlocksHelper();
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Retrieves all subjects belonging to a block.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing blockId.
 * @returns {Promise<Array>} List of subject documents.
 */
async function GetSubjects(_, args) {
  try {
    const { error } = objectIdSchema.validate(args.blockId);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.GetSubjectsHelper(args.blockId);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Retrieves all tests belonging to a subject.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Query arguments containing subjectId.
 * @returns {Promise<Array>} List of test documents.
 */
async function GetTests(_, args) {
  try {
    const { error } = objectIdSchema.validate(args.subjectId);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.GetTestsHelper(args.subjectId);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Query: {
    getBlocks: GetBlocks,
    getSubjects: GetSubjects,
    getTests: GetTests,
  },
  Block: { id: IdFieldResolver },
  Subject: { id: IdFieldResolver },
  Test: { id: IdFieldResolver },
};
