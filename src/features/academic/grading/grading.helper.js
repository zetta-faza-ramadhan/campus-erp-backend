// *************** IMPORT CORE ***************
const path = require('path');
const { Worker } = require('worker_threads');

// *************** IMPORT MODULE ***************
const AppError = require('../../../core/error');
const logger = require('../../../core/logger');
const TestModel = require('../curriculum/curriculum.model.test');
const SubjectModel = require('../curriculum/curriculum.model.subject');
const StudentModel = require('../../users/student/student.model');
const StudentGradeModel = require('./student_grade.model');

// *************** IMPORT VALIDATOR ***************
const {
  MAX_AGGREGATION_STUDENTS,
  ValidateAndSanitizeSubmitTestGrades,
  ValidateAndSanitizeSpawnGradeAggregator,
} = require('./grading.validator');

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require('../../../core/helper_error');

// *************** START: Grading Helper Function ***************

/**
 * Extracts the test id from a test-grade group.
 *
 * @param {Object} group - A test-grade group.
 * @param {string} group.test_id - The test id.
 * @returns {string} The test id.
 */
function ExtractTestId(group) {
  return group.test_id;
}

/**
 * Extracts the grade entries from a test-grade group.
 *
 * @param {Object} group - A test-grade group.
 * @param {Array<Object>} group.grades - The grade entries for the test.
 * @returns {Array<Object>} The grade entries.
 */
function ExtractGradesFromGroup(group) {
  return group.grades;
}

/**
 * Extracts the student id from a grade entry.
 *
 * @param {Object} grade - A grade entry.
 * @param {string} grade.student_id - The student id.
 * @returns {string} The student id.
 */
function ExtractStudentId(grade) {
  return grade.student_id;
}

/**
 * Extracts the owning subject id from a test document as a string.
 *
 * @param {Object} test - A lean test document.
 * @returns {string} The owning subject id.
 */
function ExtractSubjectOwnerId(test) {
  return String(test.subject_id);
}

/**
 * Extracts the owning block id from a subject document as a string.
 *
 * @param {Object} subject - A lean subject document.
 * @returns {string} The owning block id.
 */
function ExtractBlockOwnerId(subject) {
  return String(subject.block_id);
}

/**
 * Maps a grade entry into the flat StudentGrade insert document by injecting
 * the test id and academic year that own it.
 *
 * @param {Object} params - The mapping inputs.
 * @param {Object} params.group - The test-grade group that owns the grade.
 * @param {Object} params.grade - The grade entry to map.
 * @param {string} params.academicYearId - The academic year the grade belongs to.
 * @returns {Object} The StudentGrade insert document.
 */
function MapGradeToDocument({ group, grade, academicYearId }) {
  return {
    student_id: grade.student_id,
    test_id: group.test_id,
    academic_year_id: academicYearId,
    score: grade.score,
  };
}

/**
 * Validates a batch of tests and student references, then bulk-inserts
 * the grades all at once, and finally spawns a background worker thread to
 * recompute the hierarchical standings without delaying the response.
 *
 * @param {Object} input - Raw grading payload.
 * @param {string} input.academicYearId - The ID of the academic year the grades belong to.
 * @param {Array<Object>} input.testGrades - Array of test-grade groups.
 * @param {string} input.testGrades[].testId - The ID of a test being graded.
 * @param {Array<Object>} input.testGrades[].grades - Array of grade entries for that test.
 * @param {string} input.testGrades[].grades[].student_id - The ID of the graded student.
 * @param {number} input.testGrades[].grades[].score - The student's score on the test.
 * @returns {Promise<Array<Object>>} The inserted StudentGrade documents.
 * @throws {AppError} 404 - Test not found.
 * @throws {AppError} 400 - Payload contains invalid student references or spans multiple blocks.
 */
async function SubmitTestGradesHelper({ academicYearId, testGrades }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeSubmitTestGrades({
      academic_year_id: academicYearId,
      test_grades: testGrades,
    });

    academicYearId = value.academic_year_id;
    testGrades = value.test_grades;

    // *************** Extract all test and student IDs into flat arrays
    const testIds = testGrades.map(ExtractTestId);
    const studentIds = [];
    const seenStudentIds = new Set();
    for (const group of testGrades) {
      for (const grade of ExtractGradesFromGroup(group)) {
        const studentId = ExtractStudentId(grade);
        if (!seenStudentIds.has(studentId)) {
          seenStudentIds.add(studentId);
          studentIds.push(studentId);
        }
      }
    }

    // *************** Verify every test exists and resolve its owning subject
    const tests = await TestModel.find({
      _id: { $in: testIds },
      deleted_at: null,
    })
      .select('subject_id')
      .lean();
    if (tests.length !== testIds.length) {
      throw new AppError('TEST_NOT_FOUND', 404, 'Test not found.');
    }

    // *************** Verify every test belongs to the same block
    const subjectIds = [...new Set(tests.map(ExtractSubjectOwnerId))];
    const subjects = await SubjectModel.find({
      _id: { $in: subjectIds },
      deleted_at: null,
    })
      .select('block_id')
      .lean();
    if (subjects.length !== subjectIds.length) {
      throw new AppError('CURRICULUM_ENTITY_NOT_FOUND', 404, 'Subject or block not found.');
    }
    const blockIds = [...new Set(subjects.map(ExtractBlockOwnerId))];
    if (blockIds.length !== 1) {
      throw new AppError('CROSS_BLOCK_SUBMISSION', 400, 'All tests must belong to the same block.');
    }

    // *************** Find all valid, non-deleted students in a single query
    const validStudentIds = await StudentModel.distinct('_id', {
      _id: { $in: studentIds },
      deleted_at: null,
    });
    const validStudentIdSet = new Set(validStudentIds.map(String));

    // *************** Validate that every student exists and is not deleted
    for (const grade of studentIds) {
      if (!validStudentIdSet.has(grade.toLowerCase())) {
        throw new AppError('INVALID_STUDENT_REFERENCE', 400, 'One or more student IDs are invalid or deleted.');
      }
    }

    // *************** Reject submissions exceeding the worker aggregation limit
    if (studentIds.length > MAX_AGGREGATION_STUDENTS) {
      throw new AppError(
        'AGGREGATION_STUDENT_LIMIT_EXCEEDED',
        400,
        `Submission contains ${studentIds.length} unique students, exceeding the maximum of ${MAX_AGGREGATION_STUDENTS} allowed for grade aggregation.`,
      );
    }

    // *************** Transform grades for Mongoose, injecting the year and test
    const mappedGrades = [];
    for (const group of testGrades) {
      for (const grade of ExtractGradesFromGroup(group)) {
        mappedGrades.push(MapGradeToDocument({ group, grade, academicYearId }));
      }
    }

    // *************** Bulk insert all grades (E11000 duplicate-key re-thrown unchanged)
    const insertedGrades = await StudentGradeModel.insertMany(mappedGrades);

    // *************** Spawn the aggregation worker, fire-and-forget
    SpawnGradeAggregator({
      studentIds,
      testIds,
      academicYearId,
    });

    return insertedGrades;
  } catch (err) {
    ReThrowHelperError(err, 'submitting grades');
  }
}

/**
 * Spawns the grade-aggregation worker thread and logs any background crash.
 * Intentionally not awaited: the standings recomputation is CPU-heavy, so the
 * caller returns its response while the worker processes in the background.
 *
 * @param {Object} params - The aggregation payload.
 * @param {Array<string>} params.studentIds - The IDs of the just-graded students.
 * @param {Array<string>} params.testIds - The IDs of the just-graded tests.
 * @param {string} params.academicYearId - The academic year of the submission.
 * @returns {void}
 */
function SpawnGradeAggregator({ studentIds, testIds, academicYearId }) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeSpawnGradeAggregator({
      studentIds,
      testIds,
      academicYearId,
    });
    studentIds = value.studentIds;
    testIds = value.testIds;
    academicYearId = value.academicYearId;

    const payload = JSON.stringify({
      student_ids: studentIds,
      test_ids: testIds,
      academic_year_id: academicYearId,
    });

    const worker = new Worker(path.join(__dirname, '../../../workers/grade_aggregator.worker.js'), { workerData: payload });

    // *************** Attach listeners to log worker crashes/failures/completion
    logger.AttachWorkerListeners(worker, 'grade_aggregator');
  } catch (err) {
    logger.error({ operation: 'grade_aggregator.spawn', err }, 'Failed to spawn grade aggregation worker');
  }
}

// *************** END: Grading Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { SubmitTestGradesHelper };
