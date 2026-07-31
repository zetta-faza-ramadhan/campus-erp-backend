// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");
const {
  blockSchema, updateBlockSchema,
  subjectSchema, updateSubjectSchema,
  testSchema, updateTestSchema,
  objectIdSchema,
} = require("./curriculum.validator");
const curriculumHelper = require("./curriculum.helper");

// *************** MUTATION ***************

/**
 * Creates a new block.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The created block document.
 */
async function CreateBlock(_, { input }) {
  try {
    const { error, value } = blockSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.CreateBlockHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Updates an existing block.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The updated block document.
 */
async function UpdateBlock(_, { input }) {
  try {
    const { error, value } = updateBlockSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.UpdateBlockHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a block by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing the block _id.
 * @returns {Promise<Object>} The soft-deleted block document.
 */
async function DeleteBlock(_, { _id: blockId }) {
  try {
    const { error } = objectIdSchema.validate(blockId);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteBlockHelper(blockId);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Creates a new subject under a block.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The created subject document.
 */
async function CreateSubject(_, { input }) {
  try {
    const { error, value } = subjectSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.CreateSubjectHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Updates an existing subject.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The updated subject document.
 */
async function UpdateSubject(_, { input }) {
  try {
    const { error, value } = updateSubjectSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.UpdateSubjectHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a subject by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing the subject _id.
 * @returns {Promise<Object>} The soft-deleted subject document.
 */
async function DeleteSubject(_, { _id: subjectId }) {
  try {
    const { error } = objectIdSchema.validate(subjectId);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteSubjectHelper(subjectId);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Creates a new test under a subject.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The created test document.
 */
async function CreateTest(_, { input }) {
  try {
    const { error, value } = testSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.CreateTestHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Updates an existing test.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing input.
 * @returns {Promise<Object>} The updated test document.
 */
async function UpdateTest(_, { input }) {
  try {
    const { error, value } = updateTestSchema.validate(input);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.UpdateTestHelper(value);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a test by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing the test _id.
 * @returns {Promise<Object>} The soft-deleted test document.
 */
async function DeleteTest(_, { _id: testId }) {
  try {
    const { error } = objectIdSchema.validate(testId);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteTestHelper(testId);
  } catch (err) {
    NormalizeGqlError(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = {
  Mutation: {
    CreateBlock,
    UpdateBlock,
    DeleteBlock,
    CreateSubject,
    UpdateSubject,
    DeleteSubject,
    CreateTest,
    UpdateTest,
    DeleteTest,
  },
};
