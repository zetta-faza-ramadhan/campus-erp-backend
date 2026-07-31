// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const BlockModel = require("./curriculum.model.block");
const SubjectModel = require("./curriculum.model.subject");
const TestModel = require("./curriculum.model.test");
const StudentGradesModel = require("./curriculum.model.student_grade");

/**
 * Validates that the total weightage of subjects in a block does not exceed 100%.
 *
 * @param {string} block_id - The ID of the block.
 * @param {number} new_weightage - The weightage of the new subject to be added.
 * @param {string} [exclude_id] - The ID of the subject being edited, excluded from the total.
 * @throws {AppError} If the total weightage exceeds 100%.
 */
async function ValidateSubjectWeightage(block_id, new_weightage, exclude_id) {
  const filter = { block_id, deleted_at: null };
  if (exclude_id) filter._id = { $ne: exclude_id };
  const subjects = await SubjectModel.find(filter);
  const totalWeightage = subjects.reduce(
    (sum, subject) => sum + subject.weightage,
    0,
  );
  const roundedTotal = Math.round(totalWeightage * 100) / 100;
  if (roundedTotal + new_weightage > 100) {
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
 * @param {string} subject_id - The ID of the subject.
 * @param {number} new_weightage - The weightage of the new test to be added.
 * @param {string} [exclude_id] - The ID of the test being edited, excluded from the total.
 * @throws {AppError} If the total weightage exceeds 100%.
 */
async function ValidateTestWeightage(subject_id, new_weightage, exclude_id) {
  const filter = { subject_id, deleted_at: null };
  if (exclude_id) filter._id = { $ne: exclude_id };
  const tests = await TestModel.find(filter);
  const totalWeightage = tests.reduce((sum, test) => sum + test.weightage, 0);
  const roundedTotal = Math.round(totalWeightage * 100) / 100;
  if (roundedTotal + new_weightage > 100) {
    throw new AppError(
      "WEIGHTAGE_LIMIT_EXCEEDED",
      400,
      "Total weightage of tests exceeds 100%.",
    );
  }
}

/**
 * Checks if an entity (block, subject, or test) is locked due to existing grades.
 *
 * @param {string} entityType - The type of the entity ('block', 'subject', or 'test').
 * @param {string} entityId - The ID of the entity to check.
 * @throws {AppError} If the entity is locked due to existing grades.
 */
async function CheckEntityLocked(entityType, entityId) {
  const gradeExists = await StudentGradesModel.exists({
    [`${entityType}_id`]: entityId,
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
 * @param {string} block_id - The ID of the block.
 * @returns {Promise<Array>} List of active subject documents.
 */
async function GetSubjectsHelper(block_id) {
  return await SubjectModel.find({ block_id, deleted_at: null }).lean();
}

/**
 * Retrieves all active tests belonging to a subject.
 *
 * @param {string} subject_id - The ID of the subject.
 * @returns {Promise<Array>} List of active test documents.
 */
async function GetTestsHelper(subject_id) {
  return await TestModel.find({ subject_id, deleted_at: null }).lean();
}

// *************** CRUD: BLOCK ***************

/**
 * Creates a new block document.
 *
 * @param {Object} data - Validated block input payload.
 * @returns {Promise<Object>} The created block document.
 */
async function CreateBlockHelper(data) {
  return await BlockModel.create(data);
}

/**
 * Updates an active block by ID.
 *
 * @param {Object} data - Payload containing id and fields to update.
 * @returns {Promise<Object>} The updated block document.
 * @throws {AppError} 404 - Block not found.
 */
async function UpdateBlockHelper(data) {
  const { id, ...fields } = data;
  await CheckEntityLocked("block", id);
  const updated = await BlockModel.findOneAndUpdate(
    { _id: id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
  return updated;
}

/**
 * Soft-deletes a block and cascades the deletion to its active subjects and tests.
 *
 * @param {string} id - The block ID.
 * @returns {Promise<Object>} The soft-deleted block document.
 * @throws {AppError} 404 - Block not found.
 */
async function DeleteBlockHelper(id) {
  await CheckEntityLocked("block", id);
  const now = new Date();
  const deleted = await BlockModel.findByIdAndUpdate(
    id,
    { deleted_at: now },
    { returnDocument: "after" },
  );
  if (!deleted) throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
  const subjects = await SubjectModel.find(
    { block_id: id, deleted_at: null },
    { _id: 1 },
  );
  await SubjectModel.updateMany(
    { block_id: id, deleted_at: null },
    { deleted_at: now },
  );
  await TestModel.updateMany(
    { subject_id: { $in: subjects.map((subject) => subject._id) } },
    { deleted_at: now },
  );
  return deleted;
}

// *************** CRUD: SUBJECT ***************

/**
 * Creates a new subject after validating weightage against its block.
 *
 * @param {Object} data - Validated subject input payload.
 * @returns {Promise<Object>} The created subject document.
 */
async function CreateSubjectHelper(data) {
  await ValidateSubjectWeightage(data.block_id, data.weightage);
  return await SubjectModel.create(data);
}

/**
 * Updates an active subject by ID and re-validates weightage against its block.
 *
 * @param {Object} data - Payload containing id and fields to update.
 * @returns {Promise<Object>} The updated subject document.
 * @throws {AppError} 404 - Subject not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateSubjectHelper(data) {
  const { id, ...fields } = data;
  await CheckEntityLocked("subject", id);
  const existing = await SubjectModel.findOne({ _id: id, deleted_at: null });
  if (!existing) throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
  const targetBlockId = fields.block_id ?? existing.block_id;
  const targetWeightage = fields.weightage ?? existing.weightage;
  await ValidateSubjectWeightage(targetBlockId, targetWeightage, id);
  const updated = await SubjectModel.findOneAndUpdate(
    { _id: id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  return updated;
}

/**
 * Soft-deletes a subject and cascades the deletion to its active tests.
 *
 * @param {string} id - The subject ID.
 * @returns {Promise<Object>} The soft-deleted subject document.
 * @throws {AppError} 404 - Subject not found.
 */
async function DeleteSubjectHelper(id) {
  await CheckEntityLocked("subject", id);
  const now = new Date();
  const deleted = await SubjectModel.findByIdAndUpdate(
    id,
    { deleted_at: now },
    { returnDocument: "after" },
  );
  if (!deleted) throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
  await TestModel.updateMany(
    { subject_id: id, deleted_at: null },
    { deleted_at: now },
  );
  return deleted;
}

// *************** CRUD: TEST ***************

/**
 * Creates a new test after validating weightage against its subject.
 *
 * @param {Object} data - Validated test input payload.
 * @returns {Promise<Object>} The created test document.
 */
async function CreateTestHelper(data) {
  await ValidateTestWeightage(data.subject_id, data.weightage);
  return await TestModel.create(data);
}

/**
 * Updates an active test by ID and re-validates weightage against its subject.
 *
 * @param {Object} data - Payload containing id and fields to update.
 * @returns {Promise<Object>} The updated test document.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateTestHelper(data) {
  const { id, ...fields } = data;
  await CheckEntityLocked("test", id);
  const existing = await TestModel.findOne({ _id: id, deleted_at: null });
  if (!existing) throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
  const targetSubjectId = fields.subject_id ?? existing.subject_id;
  const targetWeightage = fields.weightage ?? existing.weightage;
  await ValidateTestWeightage(targetSubjectId, targetWeightage, id);
  const updated = await TestModel.findOneAndUpdate(
    { _id: id, deleted_at: null },
    fields,
    { returnDocument: "after" },
  );
  return updated;
}

/**
 * Soft-deletes a test by ID.
 *
 * @param {string} id - The test ID.
 * @returns {Promise<Object>} The soft-deleted test document.
 * @throws {AppError} 404 - Test not found.
 */
async function DeleteTestHelper(id) {
  await CheckEntityLocked("test", id);
  const deleted = await TestModel.findByIdAndUpdate(
    id,
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
