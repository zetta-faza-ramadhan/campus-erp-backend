// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");
const {
  blockSchema,
  updateBlockSchema,
  subjectSchema,
  updateSubjectSchema,
  testSchema,
  updateTestSchema,
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
    const { name, academic_year, grading_rules } = value;
    return await curriculumHelper.CreateBlockHelper({
      name,
      academicYear: academic_year,
      gradingRules: grading_rules,
    });
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
    const { _id, name, academic_year, grading_rules } = value;
    return await curriculumHelper.UpdateBlockHelper({
      _id,
      name,
      academicYear: academic_year,
      gradingRules: grading_rules,
    });
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a block by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing block_id.
 * @returns {Promise<Object>} The soft-deleted block document.
 */
async function DeleteBlock(_, { block_id }) {
  try {
    const { error } = objectIdSchema.validate(block_id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteBlockHelper(block_id);
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
    const { name, block_id, weightage, grading_rules } = value;
    return await curriculumHelper.CreateSubjectHelper({
      name,
      blockId: block_id,
      weightage,
      gradingRules: grading_rules,
    });
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
    const { _id, name, block_id, weightage, grading_rules } = value;
    return await curriculumHelper.UpdateSubjectHelper({
      _id,
      name,
      blockId: block_id,
      weightage,
      gradingRules: grading_rules,
    });
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a subject by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing subject_id.
 * @returns {Promise<Object>} The soft-deleted subject document.
 */
async function DeleteSubject(_, { subject_id }) {
  try {
    const { error } = objectIdSchema.validate(subject_id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteSubjectHelper(subject_id);
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
    const { name, subject_id, weightage, grading_rules } = value;
    return await curriculumHelper.CreateTestHelper({
      name,
      subjectId: subject_id,
      weightage,
      gradingRules: grading_rules,
    });
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
    const { _id, name, subject_id, weightage, grading_rules } = value;
    return await curriculumHelper.UpdateTestHelper({
      _id,
      name,
      subjectId: subject_id,
      weightage,
      gradingRules: grading_rules,
    });
  } catch (err) {
    NormalizeGqlError(err);
  }
}

/**
 * Deletes a test by its ID.
 *
 * @param {Object} _ - Unused parent object.
 * @param {Object} args - Mutation arguments containing test_id.
 * @returns {Promise<Object>} The soft-deleted test document.
 */
async function DeleteTest(_, { test_id }) {
  try {
    const { error } = objectIdSchema.validate(test_id);
    if (error) NormalizeGqlError(error);
    return await curriculumHelper.DeleteTestHelper(test_id);
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
