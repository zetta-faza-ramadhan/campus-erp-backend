// *************** IMPORT LIBRARY ***************
const { Types } = require("mongoose");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const BlockModel = require("./curriculum.model.block");
const SubjectModel = require("./curriculum.model.subject");
const TestModel = require("./curriculum.model.test");
const StudentGradeModel = require("../grading/student_grade.model");

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require("../../../core/helper_error");

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeCreateBlock,
  ValidateAndSanitizeUpdateBlock,
  ValidateAndSanitizeCreateSubject,
  ValidateAndSanitizeUpdateSubject,
  ValidateAndSanitizeCreateTest,
  ValidateAndSanitizeUpdateTest,
  ValidateAndSanitizeId,
  ValidateAndSanitizeEntityLockParam,
} = require("./curriculum.validator");

/**
 * Validates that the total weightage of subjects in a block does not exceed 100%.
 *
 * @param {string} blockId - The ID of the block.
 * @param {number} newWeightage - The weightage of the new subject to be added.
 * @param {string} [excludeId] - The ID of the subject being edited, excluded from the total.
 * @throws {AppError} If the total weightage exceeds 100%.
 */
async function ValidateSubjectWeightage(blockId, newWeightage, excludeId) {
  try {
    const filter = { block_id: blockId, deleted_at: null };
    // *************** EXCLUDE THE EDITED RECORD FROM THE TOTAL
    if (excludeId) filter._id = { $ne: excludeId };
    const subjects = await SubjectModel.find(filter).select("weightage").lean();
    const totalWeightage = subjects.reduce(
      (sum, subject) => sum + subject.weightage,
      0,
    );
    const capped = Math.round((totalWeightage + newWeightage) * 100) / 100;
    if (capped > 100) {
      throw new AppError(
        "WEIGHTAGE_LIMIT_EXCEEDED",
        400,
        "Total weightage of subjects exceeds 100%.",
      );
    }
  } catch (err) {
    ReThrowHelperError(err, "validating subject weightage");
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
  try {
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
  } catch (err) {
    ReThrowHelperError(err, "validating test weightage");
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
  try {
    // *************** Validate the entity type and ID before any lookup
    const value = ValidateAndSanitizeEntityLockParam({ entityType, entityId });
    entityType = value.entityType;
    entityId = value.entityId;
    let testIds;

    // *************** Resolve the entity to its descendant test IDs
    if (entityType === "test") {
      // *************** The test itself is the only descendant
      testIds = [entityId];
    } else if (entityType === "subject") {
      // ***************  Collect all active tests under this subject
      testIds = await TestModel.distinct("_id", {
        subject_id: entityId,
        deleted_at: null,
      });
    } else {
      // *************** Collect all active subjects, then all active tests under those subjects
      const subjectIds = await SubjectModel.distinct("_id", {
        block_id: entityId,
        deleted_at: null,
      });
      testIds = await TestModel.distinct("_id", {
        subject_id: { $in: subjectIds },
        deleted_at: null,
      });
    }

    // *************** No descendant tests -> nothing can be locked by grades
    if (testIds.length === 0) {
      return;
    }

    // *************** Entity is locked when any descendant test already has grades
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
  } catch (err) {
    ReThrowHelperError(err, "checking the entity lock");
  }
}

// *************** QUERY ***************

/**
 * Retrieves all active blocks.
 *
 * @returns {Promise<Array>} List of active block documents.
 */
async function GetBlocksHelper() {
  try {
    return await BlockModel.find({ deleted_at: null }).lean();
  } catch (err) {
    ReThrowHelperError(err, "fetching blocks");
  }
}

/**
 * Retrieves all active subjects belonging to a block.
 *
 * @param {string} blockId - The ID of the block.
 * @returns {Promise<Array>} List of active subject documents.
 */
async function GetSubjectsHelper(blockId) {
  try {
    blockId = ValidateAndSanitizeId(blockId);
    return await SubjectModel.find({
      block_id: blockId,
      deleted_at: null,
    }).lean();
  } catch (err) {
    ReThrowHelperError(err, "fetching subjects");
  }
}

/**
 * Retrieves all active tests belonging to a subject.
 *
 * @param {string} subjectId - The ID of the subject.
 * @returns {Promise<Array>} List of active test documents.
 */
async function GetTestsHelper(subjectId) {
  try {
    subjectId = ValidateAndSanitizeId(subjectId);
    return await TestModel.find({
      subject_id: subjectId,
      deleted_at: null,
    }).lean();
  } catch (err) {
    ReThrowHelperError(err, "fetching tests");
  }
}

// *************** CRUD: BLOCK ***************

/**
 * Creates a new block document.
 *
 * @param {Object} input - Raw block input payload.
 * @param {string} input.name - The block's name.
 * @param {string} input.academicYear - The academic year this block belongs to.
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The created block document.
 */
async function CreateBlockHelper({ name, academicYear, gradingRules }) {
  try {
    const value = ValidateAndSanitizeCreateBlock({
      name,
      academic_year: academicYear,
      grading_rules: gradingRules,
    });
    name = value.name;
    academicYear = value.academic_year;
    gradingRules = value.grading_rules;
    return await BlockModel.create({
      name,
      academic_year: academicYear,
      grading_rules: gradingRules,
    });
  } catch (err) {
    ReThrowHelperError(err, "creating the block");
  }
}

/**
 * Updates an active block by ID.
 *
 * @param {Object} input - Raw block update payload.
 * @param {string} input._id - The ID of the block to update.
 * @param {string} input.name - The block's name.
 * @param {string} input.academicYear - The academic year this block belongs to.
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The updated block document.
 * @throws {AppError} 404 - Block not found.
 */
async function UpdateBlockHelper({ _id, name, academicYear, gradingRules }) {
  try {
    const value = ValidateAndSanitizeUpdateBlock({
      _id,
      name,
      academic_year: academicYear,
      grading_rules: gradingRules,
    });
    _id = value._id;
    name = value.name;
    academicYear = value.academic_year;
    gradingRules = value.grading_rules;
    const fields = Object.fromEntries(
      Object.entries({
        name,
        academic_year: academicYear,
        grading_rules: gradingRules,
      }).filter(([, v]) => v !== undefined),
    );
    await CheckEntityLocked("block", _id);
    const updated = await BlockModel.findOneAndUpdate(
      { _id, deleted_at: null },
      fields,
      { returnDocument: "after" },
    );
    if (!updated) {
      throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
    }
    return updated;
  } catch (err) {
    ReThrowHelperError(err, "updating the block");
  }
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
  try {
    _id = ValidateAndSanitizeId(_id);
    await CheckEntityLocked("block", _id);
    const now = new Date();
    const deleted = await BlockModel.findOneAndUpdate(
      { _id, deleted_at: null },
      { deleted_at: now },
      { returnDocument: "after" },
    );
    if (!deleted) {
      throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
    }
    const subjects = await SubjectModel.find(
      { block_id: _id, deleted_at: null },
      { _id: 1 },
    ).lean();
    await SubjectModel.updateMany(
      { block_id: _id, deleted_at: null },
      { deleted_at: now },
    );
    await TestModel.updateMany(
      {
        subject_id: { $in: subjects.map((subject) => subject._id) },
        deleted_at: null,
      },
      { deleted_at: now },
    );
    return deleted;
  } catch (err) {
    ReThrowHelperError(err, "deleting the block");
  }
}

// *************** CRUD: SUBJECT ***************

/**
 * Creates a new subject after validating weightage against its block.
 *
 * @param {Object} input - Raw subject input payload.
 * @param {string} input.name - The subject's name.
 * @param {string} input.blockId - The ID of the parent block.
 * @param {number} input.weightage - The subject's weightage contribution (0-100).
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The created subject document.
 */
async function CreateSubjectHelper({ name, blockId, weightage, gradingRules }) {
  try {
    const value = ValidateAndSanitizeCreateSubject({
      name,
      block_id: blockId,
      weightage,
      grading_rules: gradingRules,
    });
    name = value.name;
    blockId = value.block_id;
    weightage = value.weightage;
    gradingRules = value.grading_rules;
    // *************** Ensure parent block exists and is active
    const block = await BlockModel.findOne({
      _id: blockId,
      deleted_at: null,
    });
    if (!block) {
      throw new AppError("BLOCK_NOT_FOUND", 404, "Block not found.");
    }
    await ValidateSubjectWeightage(blockId, weightage);
    return await SubjectModel.create({
      name,
      block_id: blockId,
      weightage,
      grading_rules: gradingRules,
    });
  } catch (err) {
    ReThrowHelperError(err, "creating the subject");
  }
}

/**
 * Updates an active subject by ID and re-validates weightage against its block.
 *
 * @param {Object} input - Raw subject update payload.
 * @param {string} input._id - The ID of the subject to update.
 * @param {string} input.name - The subject's name.
 * @param {string} input.blockId - The ID of the parent block.
 * @param {number} input.weightage - The subject's weightage contribution (0-100).
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The updated subject document.
 * @throws {AppError} 404 - Subject not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateSubjectHelper({
  _id,
  name,
  blockId,
  weightage,
  gradingRules,
}) {
  try {
    const value = ValidateAndSanitizeUpdateSubject({
      _id,
      name,
      block_id: blockId,
      weightage,
      grading_rules: gradingRules,
    });
    _id = value._id;
    name = value.name;
    blockId = value.block_id;
    weightage = value.weightage;
    gradingRules = value.grading_rules;
    const fields = Object.fromEntries(
      Object.entries({
        name,
        block_id: blockId,
        weightage,
        grading_rules: gradingRules,
      }).filter(([, v]) => v !== undefined),
    );
    if (fields.block_id && typeof fields.block_id === "string")
      fields.block_id = new Types.ObjectId(fields.block_id);
    await CheckEntityLocked("subject", _id);
    const existing = await SubjectModel.findOne({
      _id,
      deleted_at: null,
    }).select("block_id weightage");
    if (!existing) {
      throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
    }
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
  } catch (err) {
    ReThrowHelperError(err, "updating the subject");
  }
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
  try {
    _id = ValidateAndSanitizeId(_id);
    await CheckEntityLocked("subject", _id);
    const now = new Date();
    const deleted = await SubjectModel.findOneAndUpdate(
      { _id, deleted_at: null },
      { deleted_at: now },
      { returnDocument: "after" },
    );
    if (!deleted) {
      throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
    }
    await TestModel.updateMany(
      { subject_id: _id, deleted_at: null },
      { deleted_at: now },
    );
    return deleted;
  } catch (err) {
    ReThrowHelperError(err, "deleting the subject");
  }
}

// *************** CRUD: TEST ***************

/**
 * Creates a new test after validating weightage against its subject.
 *
 * @param {Object} input - Raw test input payload.
 * @param {string} input.name - The test's name.
 * @param {string} input.subjectId - The ID of the parent subject.
 * @param {number} input.weightage - The test's weightage contribution (0-100).
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The created test document.
 */
async function CreateTestHelper({ name, subjectId, weightage, gradingRules }) {
  try {
    const value = ValidateAndSanitizeCreateTest({
      name,
      subject_id: subjectId,
      weightage,
      grading_rules: gradingRules,
    });
    name = value.name;
    subjectId = value.subject_id;
    weightage = value.weightage;
    gradingRules = value.grading_rules;
    // *************** Ensure parent subject exists and is active
    const subject = await SubjectModel.findOne({
      _id: subjectId,
      deleted_at: null,
    });
    if (!subject) {
      throw new AppError("SUBJECT_NOT_FOUND", 404, "Subject not found.");
    }
    await ValidateTestWeightage(subjectId, weightage);
    return await TestModel.create({
      name,
      subject_id: subjectId,
      weightage,
      grading_rules: gradingRules,
    });
  } catch (err) {
    ReThrowHelperError(err, "creating the test");
  }
}

/**
 * Updates an active test by ID and re-validates weightage against its subject.
 *
 * @param {Object} input - Raw test update payload.
 * @param {string} input._id - The ID of the test to update.
 * @param {string} input.name - The test's name.
 * @param {string} input.subjectId - The ID of the parent subject.
 * @param {number} input.weightage - The test's weightage contribution (0-100).
 * @param {Array<Object>} input.gradingRules - Array of grading rules { label, operator, threshold }.
 * @returns {Promise<Object>} The updated test document.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Total weightage exceeds 100%.
 */
async function UpdateTestHelper({
  _id,
  name,
  subjectId,
  weightage,
  gradingRules,
}) {
  try {
    const value = ValidateAndSanitizeUpdateTest({
      _id,
      name,
      subject_id: subjectId,
      weightage,
      grading_rules: gradingRules,
    });
    _id = value._id;
    name = value.name;
    subjectId = value.subject_id;
    weightage = value.weightage;
    gradingRules = value.grading_rules;
    const fields = Object.fromEntries(
      Object.entries({
        name,
        subject_id: subjectId,
        weightage,
        grading_rules: gradingRules,
      }).filter(([, v]) => v !== undefined),
    );
    if (fields.subject_id && typeof fields.subject_id === "string")
      fields.subject_id = new Types.ObjectId(fields.subject_id);
    await CheckEntityLocked("test", _id);
    const existing = await TestModel.findOne({ _id, deleted_at: null }).select(
      "subject_id weightage",
    );
    if (!existing) {
      throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
    }
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
  } catch (err) {
    ReThrowHelperError(err, "updating the test");
  }
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
  try {
    _id = ValidateAndSanitizeId(_id);
    await CheckEntityLocked("test", _id);
    const deleted = await TestModel.findOneAndUpdate(
      { _id, deleted_at: null },
      { deleted_at: new Date() },
      { returnDocument: "after" },
    );
    if (!deleted) {
      throw new AppError("TEST_NOT_FOUND", 404, "Test not found.");
    }
    return deleted;
  } catch (err) {
    ReThrowHelperError(err, "deleting the test");
  }
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
