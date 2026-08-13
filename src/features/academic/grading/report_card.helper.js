// *************** IMPORT MODULE ***************
const AppError = require('../../../core/error');
const StudentModel = require('../../users/student/student.model');
const AcademicYearModel = require('../enrollment/academic_year.model');
const BlockModel = require('../curriculum/curriculum.model.block');
const SubjectModel = require('../curriculum/curriculum.model.subject');
const TestModel = require('../curriculum/curriculum.model.test');
const AcademicStandingModel = require('./academic_standing.model');

// *************** IMPORT VALIDATOR ***************
const {
  ValidateAndSanitizeReportCardParams,
  ValidateAndSanitizeMapTestToTemplate,
  ValidateAndSanitizeMapSubjectToTemplate,
  ValidateAndSanitizeFormatReportDate,
  ValidateAndSanitizeExtractId,
  ValidateAndSanitizeExtractTestIdsFromSubject,
  ValidateAndSanitizeBuildNameEntry,
} = require('./grading.validator');

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
  try {
    // *************** Validate input
    const validDate = ValidateAndSanitizeFormatReportDate(date);
    // *************** Format into a human-readable issue date
    const formattedDate = validDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return formattedDate;
  } catch (err) {
    ReThrowHelperError(err, 'formatting the report date');
  }
}

/**
 * Extracts an entity id from a standing subject or test entry, using either
 * the "subject_id" or "test_id" reference field.
 *
 * @param {Object} entry - A standing subject or test entry.
 * @param {string} idField - The reference field name ("subject_id" | "test_id").
 * @returns {import('mongoose').Types.ObjectId} The referenced entity id.
 */
function ExtractId(entry, idField) {
  try {
    // *************** Validate input
    const params = ValidateAndSanitizeExtractId({ entry, idField });
    // *************** Extract the referenced entity id
    const id = params.entry[params.idField];
    return id;
  } catch (err) {
    ReThrowHelperError(err, 'extracting an entity id');
  }
}

/**
 * Extracts the test ids from a standing subject entry's test breakdown.
 *
 * @param {Object} subject - A standing subject entry.
 * @param {Array<Object>} [subject.tests] - The per-test breakdown.
 * @returns {Array<import('mongoose').Types.ObjectId>} The test ids.
 */
function ExtractTestIdsFromSubject(subject) {
  try {
    // *************** Validate input
    const params = ValidateAndSanitizeExtractTestIdsFromSubject({ subject });
    // *************** Extract the per-test ids
    const testIds = (params.subject.tests || []).map((test) => ExtractId(test, 'test_id'));
    return testIds;
  } catch (err) {
    ReThrowHelperError(err, 'extracting test ids from a subject');
  }
}

/**
 * Builds an id-to-name map entry from a lean curriculum document (subject or
 * test), which both expose a "_id" and a "name" field.
 *
 * @param {Object} doc - A lean subject or test document.
 * @param {import('mongoose').Types.ObjectId} doc._id - The entity id.
 * @param {string} doc.name - The entity name.
 * @returns {[string, string]} The [id, name] pair.
 */
function BuildNameEntry(doc) {
  try {
    // *************** Validate input
    const params = ValidateAndSanitizeBuildNameEntry({ doc });
    // *************** Build the [id, name] pair
    const entry = [String(params.doc._id), params.doc.name];
    return entry;
  } catch (err) {
    ReThrowHelperError(err, 'building a name map entry');
  }
}

/**
 * Maps a standing test entry into its template context, resolving the
 * curriculum name.
 *
 * @param {Object} test - A standing test entry.
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @returns {Object} The template test context.
 */
function MapTestToTemplate(test, testNameById) {
  try {
    // *************** Validate input
    const params = ValidateAndSanitizeMapTestToTemplate({ test, testNameById });
    // *************** Shape the template test context
    const templateTest = {
      name: params.testNameById.get(String(params.test.test_id)),
      total_mark: params.test.total_mark,
      test_status: params.test.test_status,
    };
    return templateTest;
  } catch (err) {
    ReThrowHelperError(err, 'mapping a test to the template');
  }
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
  try {
    // *************** Validate input
    const params = ValidateAndSanitizeMapSubjectToTemplate({ subject, subjectNameById, testNameById });
    // *************** Shape the template subject context
    const templateSubject = {
      name: params.subjectNameById.get(String(params.subject.subject_id)),
      subject_average: params.subject.subject_average,
      subject_status: params.subject.subject_status,
      tests: (params.subject.tests || []).map((test) => MapTestToTemplate(test, params.testNameById)),
    };
    return templateSubject;
  } catch (err) {
    ReThrowHelperError(err, 'mapping a subject to the template');
  }
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
    const subjectIds = standingSubjects.map((subject) => ExtractId(subject, 'subject_id'));
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

    const subjectNameById = new Map(subjects.map(BuildNameEntry));
    const testNameById = new Map(tests.map(BuildNameEntry));

    // *************** Shape the template context from the fetched documents
    const reportCardContext = {
      student: {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        student_number: student.student_number,
      },
      academic_year: { name: academicYear?.name },
      block: { name: block?.name },
      block_average: standing.block_average,
      block_status: standing.block_status,
      generated_at: FormatReportDate(),
      subjects: standingSubjects.map((subject) => MapSubjectToTemplate(subject, subjectNameById, testNameById)),
    };
    return reportCardContext;
  } catch (err) {
    ReThrowHelperError(err, 'building the report card');
  }
}

// *************** END: Report Card Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { FetchReportCardDataHelper };
