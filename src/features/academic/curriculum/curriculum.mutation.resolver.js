// *************** IMPORT MODULE ***************
const { NormalizeGqlError } = require("../../../core/graphql_error");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeCreateBlock,
  ValidateAndSanitizeUpdateBlock,
  ValidateAndSanitizeBlockId,
  ValidateAndSanitizeCreateSubject,
  ValidateAndSanitizeUpdateSubject,
  ValidateAndSanitizeSubjectId,
  ValidateAndSanitizeCreateTest,
  ValidateAndSanitizeUpdateTest,
  ValidateAndSanitizeTestId,
} = require("./curriculum.validator");

// *************** IMPORT HELPER FUNCTION ***************
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
    ValidateAndSanitizeCreateBlock(input);
    const result = await curriculumHelper.CreateBlockHelper({
      name: input.name,
      academicYear: input.academic_year,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeUpdateBlock(input);
    const result = await curriculumHelper.UpdateBlockHelper({
      _id: input._id,
      name: input.name,
      academicYear: input.academic_year,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeBlockId(block_id);
    const result = await curriculumHelper.DeleteBlockHelper(block_id);
    return result;
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
    ValidateAndSanitizeCreateSubject(input);
    const result = await curriculumHelper.CreateSubjectHelper({
      name: input.name,
      blockId: input.block_id,
      weightage: input.weightage,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeUpdateSubject(input);
    const result = await curriculumHelper.UpdateSubjectHelper({
      _id: input._id,
      name: input.name,
      blockId: input.block_id,
      weightage: input.weightage,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeSubjectId(subject_id);
    const result = await curriculumHelper.DeleteSubjectHelper(subject_id);
    return result;
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
    ValidateAndSanitizeCreateTest(input);
    const result = await curriculumHelper.CreateTestHelper({
      name: input.name,
      subjectId: input.subject_id,
      weightage: input.weightage,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeUpdateTest(input);
    const result = await curriculumHelper.UpdateTestHelper({
      _id: input._id,
      name: input.name,
      subjectId: input.subject_id,
      weightage: input.weightage,
      gradingRules: input.grading_rules,
    });
    return result;
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
    ValidateAndSanitizeTestId(test_id);
    const result = await curriculumHelper.DeleteTestHelper(test_id);
    return result;
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
