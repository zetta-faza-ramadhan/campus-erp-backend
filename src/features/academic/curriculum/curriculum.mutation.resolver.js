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
    const value = ValidateAndSanitizeCreateBlock(input);
    const result = await curriculumHelper.CreateBlockHelper({
      name: value.name,
      academicYear: value.academic_year,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeUpdateBlock(input);
    const result = await curriculumHelper.UpdateBlockHelper({
      _id: value._id,
      name: value.name,
      academicYear: value.academic_year,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeBlockId(block_id);
    const result = await curriculumHelper.DeleteBlockHelper(value);
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
    const value = ValidateAndSanitizeCreateSubject(input);
    const result = await curriculumHelper.CreateSubjectHelper({
      name: value.name,
      blockId: value.block_id,
      weightage: value.weightage,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeUpdateSubject(input);
    const result = await curriculumHelper.UpdateSubjectHelper({
      _id: value._id,
      name: value.name,
      blockId: value.block_id,
      weightage: value.weightage,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeSubjectId(subject_id);
    const result = await curriculumHelper.DeleteSubjectHelper(value);
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
    const value = ValidateAndSanitizeCreateTest(input);
    const result = await curriculumHelper.CreateTestHelper({
      name: value.name,
      subjectId: value.subject_id,
      weightage: value.weightage,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeUpdateTest(input);
    const result = await curriculumHelper.UpdateTestHelper({
      _id: value._id,
      name: value.name,
      subjectId: value.subject_id,
      weightage: value.weightage,
      gradingRules: value.grading_rules,
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
    const value = ValidateAndSanitizeTestId(test_id);
    const result = await curriculumHelper.DeleteTestHelper(value);
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
