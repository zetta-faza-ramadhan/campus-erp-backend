// *************** IMPORT LIBRARY ***************
const { GraphQLError } = require("graphql");
const Joi = require("joi");

// *************** IMPORT MODULE ***************
const {
  blockSchema, updateBlockSchema,
  subjectSchema, updateSubjectSchema,
  testSchema, updateTestSchema,
  objectIdSchema,
} = require("./curriculum.validator");
const curriculumHelper = require("./curriculum.helper");

// *************** NORMALIZE GQL ERROR ***************
/**
 * Catches and normalizes errors into a standard GraphQL error format.
 *
 * @param {Error} err - The caught error (Joi, AppError, or generic).
 * @throws {GraphQLError} A formatted GraphQL error.
 */
function NormalizeGqlError(err) {
  if (err instanceof GraphQLError) throw err;
  if (Joi.isError(err)) {
    throw new GraphQLError(err.message, {
      extensions: { code: "VALIDATION_ERROR", status: 400 },
    });
  }
  if (err.isOperational) {
    throw new GraphQLError(err.description, {
      extensions: { code: err.code, status: err.statusCode },
    });
  }
  throw new GraphQLError("Internal server error", {
    extensions: { code: "INTERNAL_ERROR", status: 500 },
  });
}

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
 * @param {Object} args - Mutation arguments containing id.
 * @returns {Promise<boolean>} Whether the deletion was successful.
 */
async function DeleteBlock(_, { id }) {
  try {
    const { error } = objectIdSchema.validate(id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteBlockHelper(id);
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
 * @param {Object} args - Mutation arguments containing id.
 * @returns {Promise<boolean>} Whether the deletion was successful.
 */
async function DeleteSubject(_, { id }) {
  try {
    const { error } = objectIdSchema.validate(id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteSubjectHelper(id);
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
 * @param {Object} args - Mutation arguments containing id.
 * @returns {Promise<boolean>} Whether the deletion was successful.
 */
async function DeleteTest(_, { id }) {
  try {
    const { error } = objectIdSchema.validate(id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteTestHelper(id);
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
  Mutation: {
    createBlock: CreateBlock,
    updateBlock: UpdateBlock,
    deleteBlock: DeleteBlock,
    createSubject: CreateSubject,
    updateSubject: UpdateSubject,
    deleteSubject: DeleteSubject,
    createTest: CreateTest,
    updateTest: UpdateTest,
    deleteTest: DeleteTest,
  },
  Block: { id: IdFieldResolver },
  Subject: { id: IdFieldResolver },
  Test: { id: IdFieldResolver },
};
