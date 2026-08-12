// *************** IMPORT MODULE ***************
const AppError = require('../../../core/error');
const StudentModel = require('../../users/student/student.model');
const AcademicYearModel = require('../enrollment/academic_year.model');
const BlockModel = require('../curriculum/curriculum.model.block');
const SubjectModel = require('../curriculum/curriculum.model.subject');
const TestModel = require('../curriculum/curriculum.model.test');
const AcademicStandingModel = require('./academic_standing.model');

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeReportCardParams } = require('./grading.validator');

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require('../../../core/helper_error');

// *************** START: Report Card Helper Function ***************

/**
 * Formats the current date as a human-readable issue date for the report card
 * (e.g. "12 Aug 2026") using the server's local timezone.
 *
 * @param {Date} [date] - The date to format; defaults to now.
 * @returns {string} The formatted issue date.
 */
function FormatReportDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Extracts the subject id from a standing subject entry.
 *
 * @param {Object} subject - A standing subject entry.
 * @param {import('mongoose').Types.ObjectId} subject.subject_id - The subject id.
 * @returns {import('mongoose').Types.ObjectId} The subject id.
 */
function ExtractSubjectId(subject) {
  return subject.subject_id;
}

/**
 * Extracts a test id from a standing test entry.
 *
 * @param {Object} test - A standing test entry.
 * @param {import('mongoose').Types.ObjectId} test.test_id - The test id.
 * @returns {import('mongoose').Types.ObjectId} The test id.
 */
function ExtractTestId(test) {
  return test.test_id;
}

/**
 * Extracts the test ids from a standing subject entry's test breakdown.
 *
 * @param {Object} subject - A standing subject entry.
 * @param {Array<Object>} [subject.tests] - The per-test breakdown.
 * @returns {Array<import('mongoose').Types.ObjectId>} The test ids.
 */
function ExtractTestIdsFromSubject(subject) {
  return (subject.tests || []).map(ExtractTestId);
}

/**
 * Builds an id-to-name map entry from a lean subject document.
 *
 * @param {Object} subject - A lean subject document.
 * @param {import('mongoose').Types.ObjectId} subject._id - The subject id.
 * @param {string} subject.name - The subject name.
 * @returns {[string, string]} The [id, name] pair.
 */
function BuildSubjectNameEntry(subject) {
  return [String(subject._id), subject.name];
}

/**
 * Builds an id-to-name map entry from a lean test document.
 *
 * @param {Object} test - A lean test document.
 * @param {import('mongoose').Types.ObjectId} test._id - The test id.
 * @param {string} test.name - The test name.
 * @returns {[string, string]} The [id, name] pair.
 */
function BuildTestNameEntry(test) {
  return [String(test._id), test.name];
}

/**
 * Maps a standing test entry into its template context, preferring the
 * resolved curriculum name and falling back to the id string.
 *
 * @param {Object} test - A standing test entry.
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @returns {Object} The template test context.
 */
function MapTestToTemplate(test, testNameById) {
  return {
    name: testNameById.get(String(test.test_id)) || String(test.test_id),
    total_mark: test.total_mark,
    test_status: test.test_status,
  };
}

/**
 * Maps a standing subject entry into its template context, resolving the
 * subject name and its nested test breakdown.
 *
 * @param {Object} subject - A standing subject entry.
 * @param {Map<string, string>} subjectNameById - Map of subject id to subject name.
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @returns {Object} The template subject context.
 */
function MapSubjectToTemplate(subject, subjectNameById, testNameById) {
  return {
    name: subjectNameById.get(String(subject.subject_id)) || String(subject.subject_id),
    subject_average: subject.subject_average,
    subject_status: subject.subject_status,
    tests: (subject.tests || []).map((test) => MapTestToTemplate(test, testNameById)),
  };
}

/**
 * Fetches the student profile and their academic standing, resolves the
 * curriculum names, and shapes the complete report-card template context.
 *
 * @param {Object} input - The report-card route parameters.
 * @param {string} input.academicYearId - The academic year id.
 * @param {string} input.studentId - The student id.
 * @returns {Promise<Object>} The template context consumed by report_card.hbs.
 * @throws {AppError} 400 - Malformed academic year or student id.
 * @throws {AppError} 404 - Student or academic standing not found.
 */
async function FetchReportCardDataHelper({ academicYearId, studentId }) {
  try {
    // *************** Validate and sanitize the route parameters
    const params = ValidateAndSanitizeReportCardParams({ academicYearId, studentId });
    academicYearId = params.academicYearId;
    studentId = params.studentId;

    // *************** Fetch the student profile, academic year, and standing
    const [student, standing, academicYear] = await Promise.all([
      StudentModel.findOne({ _id: studentId, deleted_at: null }).select('first_name last_name email student_number').lean(),
      AcademicStandingModel.findOne({ student_id: studentId, academic_year_id: academicYearId })
        .select('block_id block_average block_status subjects')
        .lean(),
      AcademicYearModel.findOne({ _id: academicYearId, deleted_at: null }).select('name').lean(),
    ]);

    // *************** Guard against a missing student or academic standing
    if (!student) {
      throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found.');
    }
    if (!standing) {
      throw new AppError('ACADEMIC_STANDING_NOT_FOUND', 404, 'Academic standing not found.');
    }

    // *************** Resolve the block, subject, and test names from the standing
    const standingSubjects = standing.subjects || [];
    const subjectIds = standingSubjects.map(ExtractSubjectId);
    const testIds = standingSubjects.flatMap(ExtractTestIdsFromSubject);

    const [block, subjects, tests] = await Promise.all([
      BlockModel.findOne({ _id: standing.block_id, deleted_at: null }).select('name').lean(),
      SubjectModel.find({ _id: { $in: subjectIds }, deleted_at: null })
        .select('name')
        .lean(),
      TestModel.find({ _id: { $in: testIds }, deleted_at: null })
        .select('name')
        .lean(),
    ]);

    const subjectNameById = new Map(subjects.map(BuildSubjectNameEntry));
    const testNameById = new Map(tests.map(BuildTestNameEntry));

    // *************** Shape the template context from the fetched documents
    return {
      student: {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        student_number: student.student_number,
      },
      academic_year: { name: academicYear?.name || String(standing.academic_year_id) },
      block: { name: block?.name || String(standing.block_id) },
      block_average: standing.block_average,
      block_status: standing.block_status,
      generated_at: FormatReportDate(),
      subjects: standingSubjects.map((subject) => MapSubjectToTemplate(subject, subjectNameById, testNameById)),
    };
  } catch (err) {
    ReThrowHelperError(err, 'building the report card');
  }
}

// *************** END: Report Card Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { FetchReportCardDataHelper };
