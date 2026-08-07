// *************** IMPORT LIBRARY ***************
const { Types } = require("mongoose");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const BlockModel = require("./curriculum.model.block");
const SubjectModel = require("./curriculum.model.subject");
const TestModel = require("./curriculum.model.test");
const StudentGradeModel = require("../grading/student_grade.model");
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

/**
 * Validates that the total weightage of subjects in a block does not exceed 100%.
 *
 * @param {string} blockId - The ID of the block.
 * @param {number} newWeightage - The weightage of the new subject to be added.
 * @param {string} [excludeId] - The ID of the subject being edited, excluded from the total.
 * @throws {AppError} If the total weightage exceeds 100%.
 */
async function ValidateSubjectWeightage(blockId, newWeightage, excludeId) {
  const filter = { block_id: blockId, deleted_at: null };
  // *************** EXCLUDE THE EDITED RECORD FROM THE TOTAL
  if (excludeId) filter._id = { $ne: excludeId };
  const subjects = await SubjectModel.find(filter).select("weightage").lean();
  const totalWeightage = subjects.reduce((sum, subject) => sum + subject.weightage, 0);
  const capped = Math.round((totalWeightage + newWeightage) * 100) / 100;
  if (capped > 100) {
    throw new AppError(
      "WEIGHTAGE_LIMIT_EXCEEDED",
      400,
      "Total weightage of subjects exceeds 100%.",
    );
  }
}

/**
 * Validates that the total weightage of tests in a subject does not exceed 100%.
 *
 * @param {string} subjectId - The ID of the subject.
 * @param {number} newWeightage - The weightage of the new test to be added.
 * @param {string} [excludeId] - The ID of the test being edited, excluded from the total.
 * @throws {AppError} If the total weightage exceeds 100%.
 */
async function ValidateTestWeightage(subjectId, newWeightage, excludeId) {
  const filter = { subject_id: subjectId, deleted_at: null };
  // *************** EXCLUDE THE EDITED RECORD FROM THE TOTAL
  if (excludeId) filter._id = { $ne: excludeId };
  const tests = await TestModel.find(filter).select("weightage").lean();
  const totalWeightage = tests.reduce((sum, test) => sum + test.weightage, 0);
  const capped = Math.round((totalWeightage + newWeightage) * 100) / 100;
  if (capped > 100) {
    throw new AppError(
      "WEIGHTAGE_LIMIT_EXCEEDED",
      400,
      "Total weightage of tests exceeds 100%.",
    );
  }
}

/**
 * Checks if an entity (block, subject, or test) is locked due to existing grades.
 * Resolves the entity to its descendant tests, then checks the grades collection
 * by test_id.
 *
 * @param {string} entityType - The type of the entity ('block', 'subject', or 'test').
 * @param {string} entityId - The ID of the entity to check.
 * @throws {AppError} If the entity is locked due to existing grades.
 */
async function CheckEntityLocked(entityType, entityId) {
  let testIds;

  if (entityType === "test") {
    testIds = [entityId];
  } else if (entityType === "subject") {
    const tests = await TestModel.find({
      subject_id: entityId,
      deleted_at: null,
    }).select("_id").lean();
    testIds = tests.map((test) => test._id);
  } else {
    const subjects = await SubjectModel.find({
      block_id: entityId,
      deleted_at: null,
    }).select("_id").lean();
    const tests = await TestModel.find({
      subject_id: { $in: subjects.map((subject) => subject._id) },
      deleted_at: null,
    }).select("_id").lean();
    testIds = tests.map((test) => test._id);
  }

  if (testIds.length === 0) {
    return;
  }

  const gradeExists = await StudentGradeModel.exists({
    test_id: { $in: testIds },
  });
  if (gradeExists) {
    throw new AppError(
      "ENTITY_LOCKED_GRADES_EXIST",
      409,
      `${entityType} is locked due to existing grades.`,
    );
  }
}

// *************** QUERY ***************

/**
 * Retrieves all active blocks.
 *
 * @returns {Promise<Array>} List of active block documents.
 */
async function GetBlocksHelper() {
  return await BlockModel.find({ deleted_at: null }).lean();
}

/**
 * Retrieves all active subjects belonging to a block.
 *
 * @param {string} blockId - The ID of the block.
 * @returns {Promise<Array>} List of active subject documents.
 */
async function GetSubjectsHelper(blockId) {
  ValidateAndSanitizeBlockId(blockId);
  return await SubjectModel.find({ block_id: blockId, deleted_at: null }).lean();
}

/**
 * Retrieves all active tests belonging to a subject.
 *
 * @param {string} subjectId - The ID of the subject.
 * @returns {Promise<Array>} List of active test documents.
 */
async function GetTestsHelper(subjectId) {
  ValidateAndSanitizeSubjectId(subjectId);
  return await TestModel.find({ subject_id: subjectId, deleted_at: null }).lean();
}

// *************** CRUD: BLOCK ***************

/**
 * Creates a new block document.
 *
 * @param {Object} input - Raw block input payload (re-validated internally).
 * @returns {Promise<Object>} The created block document.
 */
async function CreateBlockHelper({ name, academicYear, gradingRules }) {
  ValidateAndSanitizeCreateBlock({
    name,
    academic_year: academicYear,
    grading_rules: gradingRules,
  });
  return await BlockModel.create({ name, academic_year: academicYear, grading_rules: gradingRules });
}

/**
 * Updates an active block by ID.
 *
 * @param {Object} input - Raw payload (re-validated internally) containing _id and fields to update.
 * @returns {Promise<Object>} The updated block document.
 * @throws {AppError} 404 - Block not found.
 */
async function UpdateBlockHelper({ _id, name, academicYear, gradingRules }) {
  ValidateAndSanitizeUpdateBlock({
    _id,
    name,
    academic_year: academicYear,
    grading_rules: gradingRules,
  });
  const fields = Object.fromEntries(
    Object.entries({ name, academic_year: academicYear, grading_rules: gradingRules })
      .filter(([, v]) => v !== undefined)
  );
  await CheckEntityLocked("block", _id);
  const updated = await BlockModel.findOneAndUpdate(
    { _id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
  return updated;
}

/**
 * Soft-deletes a block and cascades the deletion to its active subjects and tests.
 * Only an active (non-deleted) block may be deleted; a second delete returns 404.
 *
 * @param {string} _id - The block ID.
 * @returns {Promise<Object>} The soft-deleted block document.
 * @throws {AppError} 404 - Block not found or already deleted.
 */
async function DeleteBlockHelper(_id) {
  ValidateAndSanitizeBlockId(_id);
  await CheckEntityLocked("block", _id);
  const now = new Date();
  const deleted = await BlockModel.findOneAndUpdate(
    { _id, deleted_at: null },
    { deleted_at: now },
    { returnDocument: "after" },
  );
  if (!deleted) throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
  const subjects = await SubjectModel.find(
    { block_id: _id, deleted_at: null },
    { _id: 1 },
  ).lean();
  await SubjectModel.updateMany(
    { block_id: _id, deleted_at: null },
    { deleted_at: now },
  );
  await TestModel.updateMany(
    { subject_id: { $in: subjects.map((subject) => subject._id) }, deleted_at: null },
    { deleted_at: now },
  );
  return deleted;
}

// *************** CRUD: SUBJECT ***************

/**
 * Creates a new subject after validating weightage against its block.
 *
 * @param {Object} input - Raw subject input payload (re-validated internally).
 * @returns {Promise<Object>} The created subject document.
 */
async function CreateSubjectHelper({ name, blockId, weightage, gradingRules }) {
  ValidateAndSanitizeCreateSubject({
    name,
    block_id: blockId,
    weightage,
    grading_rules: gradingRules,
  });
  // *************** Ensure parent block exists and is active
  const block = await BlockModel.findOne({
    _id: blockId,
    deleted_at: null,
  });
  if (!block) throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
  await ValidateSubjectWeightage(blockId, weightage);
  return await SubjectModel.create({ name, block_id: blockId, weightage, grading_rules: gradingRules });
}

/**
 * Updates an active subject by ID and re-validates weightage against its block.
 *
 * @param {Object} input - Raw payload (re-validated internally) containing _id and fields to update.
 * @returns {Promise<Object>} The updated subject document.
 * @throws {AppError} 404 - Subject not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateSubjectHelper({ _id, name, blockId, weightage, gradingRules }) {
  ValidateAndSanitizeUpdateSubject({
    _id,
    name,
    block_id: blockId,
    weightage,
    grading_rules: gradingRules,
  });
  const fields = Object.fromEntries(
    Object.entries({ name, block_id: blockId, weightage, grading_rules: gradingRules })
      .filter(([, v]) => v !== undefined)
  );
  if (fields.block_id && typeof fields.block_id === "string") fields.block_id = new Types.ObjectId(fields.block_id);
  await CheckEntityLocked("subject", _id);
  const existing = await SubjectModel.findOne({ _id, deleted_at: null }).select("block_id weightage");
  if (!existing) throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
  const targetBlockId = fields.block_id ?? existing.block_id;
  if (fields.block_id) {
    // *************** Ensure the target parent block exists and is active
    const targetBlock = await BlockModel.findOne({
      _id: targetBlockId,
      deleted_at: null,
    });
    if (!targetBlock) {
      throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
    }
  }
  const targetWeightage = fields.weightage ?? existing.weightage;
  await ValidateSubjectWeightage(targetBlockId, targetWeightage, _id);
  const updated = await SubjectModel.findOneAndUpdate(
    { _id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  return updated;
}

/**
 * Soft-deletes a subject and cascades the deletion to its active tests.
 * Only an active (non-deleted) subject may be deleted; a second delete returns 404.
 *
 * @param {string} _id - The subject ID.
 * @returns {Promise<Object>} The soft-deleted subject document.
 * @throws {AppError} 404 - Subject not found or already deleted.
 */
async function DeleteSubjectHelper(_id) {
  ValidateAndSanitizeSubjectId(_id);
  await CheckEntityLocked("subject", _id);
  const now = new Date();
  const deleted = await SubjectModel.findOneAndUpdate(
    { _id, deleted_at: null },
    { deleted_at: now },
    { returnDocument: "after" },
  );
  if (!deleted) throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
  await TestModel.updateMany(
    { subject_id: _id, deleted_at: null },
    { deleted_at: now },
  );
  return deleted;
}

// *************** CRUD: TEST ***************

/**
 * Creates a new test after validating weightage against its subject.
 *
 * @param {Object} input - Raw test input payload (re-validated internally).
 * @returns {Promise<Object>} The created test document.
 */
async function CreateTestHelper({ name, subjectId, weightage, gradingRules }) {
  ValidateAndSanitizeCreateTest({
    name,
    subject_id: subjectId,
    weightage,
    grading_rules: gradingRules,
  });
  // *************** Ensure parent subject exists and is active
  const subject = await SubjectModel.findOne({
    _id: subjectId,
    deleted_at: null,
  });
  if (!subject) throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
  await ValidateTestWeightage(subjectId, weightage);
  return await TestModel.create({ name, subject_id: subjectId, weightage, grading_rules: gradingRules });
}

/**
 * Updates an active test by ID and re-validates weightage against its subject.
 *
 * @param {Object} input - Raw payload (re-validated internally) containing _id and fields to update.
 * @returns {Promise<Object>} The updated test document.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateTestHelper({ _id, name, subjectId, weightage, gradingRules }) {
  ValidateAndSanitizeUpdateTest({
    _id,
    name,
    subject_id: subjectId,
    weightage,
    grading_rules: gradingRules,
  });
  const fields = Object.fromEntries(
    Object.entries({ name, subject_id: subjectId, weightage, grading_rules: gradingRules })
      .filter(([, v]) => v !== undefined)
  );
  if (fields.subject_id && typeof fields.subject_id === "string") fields.subject_id = new Types.ObjectId(fields.subject_id);
  await CheckEntityLocked("test", _id);
  const existing = await TestModel.findOne({ _id, deleted_at: null }).select("subject_id weightage");
  if (!existing) throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
  const targetSubjectId = fields.subject_id ?? existing.subject_id;
  if (fields.subject_id) {
    // *************** Ensure the target parent subject exists and is active
    const targetSubject = await SubjectModel.findOne({
      _id: targetSubjectId,
      deleted_at: null,
    });
    if (!targetSubject) {
      throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
    }
  }
  const targetWeightage = fields.weightage ?? existing.weightage;
  await ValidateTestWeightage(targetSubjectId, targetWeightage, _id);
  const updated = await TestModel.findOneAndUpdate(
    { _id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  return updated;
}

/**
 * Soft-deletes a test by ID.
 * Only an active (non-deleted) test may be deleted; a second delete returns 404.
 *
 * @param {string} _id - The test ID.
 * @returns {Promise<Object>} The soft-deleted test document.
 * @throws {AppError} 404 - Test not found or already deleted.
 */
async function DeleteTestHelper(_id) {
  ValidateAndSanitizeTestId(_id);
  await CheckEntityLocked("test", _id);
  const deleted = await TestModel.findOneAndUpdate(
    { _id, deleted_at: null },
    { deleted_at: new Date() },
    { returnDocument: "after" },
  );
  if (!deleted) throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
  return deleted;
}

// *************** EXPORT MODULE ***************
module.exports = {
  ValidateSubjectWeightage,
  ValidateTestWeightage,
  CheckEntityLocked,
  GetBlocksHelper,
  GetSubjectsHelper,
  GetTestsHelper,
  CreateBlockHelper,
  UpdateBlockHelper,
  DeleteBlockHelper,
  CreateSubjectHelper,
  UpdateSubjectHelper,
  DeleteSubjectHelper,
  CreateTestHelper,
  UpdateTestHelper,
  DeleteTestHelper,
};
