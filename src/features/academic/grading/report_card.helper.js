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
    const testIds = (params.subject.tests || []).map(ExtractTestId);
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
 * Extracts the test_id from a standing test entry.
 *
 * @param {Object} test - A standing test entry.
 * @param {import('mongoose').Types.ObjectId} test.test_id - The test id.
 * @returns {import('mongoose').Types.ObjectId} The test id.
 */
function ExtractTestId(test) {
  const result = ExtractId(test, 'test_id');
  return result;
}

/**
 * Checks whether a single id is absent from an id-to-name map.
 *
 * @param {Map<string, string>} nameById - The id-to-name map.
 * @param {string|import('mongoose').Types.ObjectId} id - The id to look up.
 * @returns {boolean} True when the id is missing from the map.
 */
function IsIdMissingFromMap(nameById, id) {
  const result = !nameById.has(String(id));
  return result;
}

/**
 * Maps a standing test entry into its template context using a name map.
 *
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @param {Object} test - A standing test entry.
 * @returns {Object} The template test context.
 */
function MapTestWithNames(testNameById, test) {
  const result = MapTestToTemplate(test, testNameById);
  return result;
}

/**
 * Extracts the block_id from a standing entry.
 *
 * @param {Object} standing - An academic standing entry.
 * @param {import('mongoose').Types.ObjectId} standing.block_id - The block id.
 * @returns {import('mongoose').Types.ObjectId} The block id.
 */
function ExtractBlockId(standing) {
  const result = ExtractId(standing, 'block_id');
  return result;
}

/**
 * Extracts all subject ids from a standing entry's subject list.
 *
 * @param {Object} standing - An academic standing entry.
 * @param {Array<Object>} [standing.subjects] - The subject breakdown.
 * @returns {Array<import('mongoose').Types.ObjectId>} The subject ids.
 */
function ExtractSubjectIdsFromStanding(standing) {
  const result = (standing.subjects || []).map(ExtractSubjectId);
  return result;
}

/**
 * Extracts the subject_id from a standing subject entry.
 *
 * @param {Object} subject - A standing subject entry.
 * @param {import('mongoose').Types.ObjectId} subject.subject_id - The subject id.
 * @returns {import('mongoose').Types.ObjectId} The subject id.
 */
function ExtractSubjectId(subject) {
  const result = ExtractId(subject, 'subject_id');
  return result;
}

/**
 * Extracts all test ids from a standing entry's nested subject breakdown.
 *
 * @param {Object} standing - An academic standing entry.
 * @param {Array<Object>} [standing.subjects] - The subject breakdown.
 * @returns {Array<import('mongoose').Types.ObjectId>} The test ids.
 */
function ExtractAllTestIdsFromStanding(standing) {
  const result = (standing.subjects || []).flatMap(ExtractTestIdsFromSubject);
  return result;
}

/**
 * Maps a standing subject entry into its template context using name maps.
 *
 * @param {Map<string, string>} subjectNameById - Map of subject id to subject name.
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @param {Object} subject - A standing subject entry.
 * @returns {Object} The template subject context.
 */
function MapSubjectWithNames(subjectNameById, testNameById, subject) {
  const result = MapSubjectToTemplate(subject, subjectNameById, testNameById);
  return result;
}

/**
 * Maps a standing entry into its report-card block template context.
 *
 * @param {Map<string, string>} blockNameById - Map of block id to block name.
 * @param {Map<string, string>} subjectNameById - Map of subject id to subject name.
 * @param {Map<string, string>} testNameById - Map of test id to test name.
 * @param {Object} standing - An academic standing entry.
 * @returns {Object} The template block context with nested subjects.
 */
function MapStandingToReportCardBlock(blockNameById, subjectNameById, testNameById, standing) {
  const standingSubjects = standing.subjects || [];
  const reportCardBlock = {
    name: blockNameById.get(String(standing.block_id)),
    block_average: standing.block_average,
    block_status: standing.block_status,
    subjects: standingSubjects.map(MapSubjectWithNames.bind(null, subjectNameById, testNameById)),
  };
  return reportCardBlock;
}

/**
 * Throws an AppError if any of the provided ids are not present in the map.
 *
 * @param {Array<string|import('mongoose').Types.ObjectId>} ids - The ids to check.
 * @param {Map<string, string>} nameById - The id-to-name map built from fetched docs.
 * @param {string} code - The AppError code (e.g. 'BLOCK_NOT_FOUND').
 * @param {string} message - The AppError description.
 * @returns {void}
 */
function GuardMissingIds(ids, nameById, code, message) {
  const missing = ids.some(IsIdMissingFromMap.bind(null, nameById));
  if (missing) {
    throw new AppError(code, 404, message);
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
      tests: (params.subject.tests || []).map(MapTestWithNames.bind(null, params.testNameById)),
    };
    return templateSubject;
  } catch (err) {
    ReThrowHelperError(err, 'mapping a subject to the template');
  }
}

/**
 * Fetches the student profile and their academic standings, resolves the
 * curriculum names, and shapes the complete report-card template context.
 *
 * @param {Object} input - The report-card route parameters.
 * @param {string} input.academicYearId - The academic year id.
 * @param {string} input.studentId - The student id.
 * @returns {Promise<Object>} The template context consumed by report_card.hbs.
 * @throws {AppError} 400 - Malformed academic year or student id.
 * @throws {AppError} 404 - Student, academic standing, academic year, or block not found.
 */
async function FetchReportCardDataHelper({ academicYearId, studentId }) {
  try {
    // *************** Validate and sanitize the route parameters
    const params = ValidateAndSanitizeReportCardParams({ academicYearId, studentId });
    academicYearId = params.academicYearId;
    studentId = params.studentId;

    // *************** Fetch the student profile, academic year, and standings
    const [student, standings, academicYear] = await Promise.all([
      StudentModel.findOne({ _id: studentId, deleted_at: null }).select('first_name last_name email student_number').lean(),
      AcademicStandingModel.find({ student_id: studentId, academic_year_id: academicYearId })
        .select('block_id block_average block_status subjects')
        .lean(),
      AcademicYearModel.findOne({ _id: academicYearId, deleted_at: null }).select('name').lean(),
    ]);

    // *************** Guard against a missing student, standing, or academic year
    if (!student) {
      throw new AppError('STUDENT_NOT_FOUND', 404, 'Student not found.');
    }
    if (standings.length === 0) {
      throw new AppError('ACADEMIC_STANDING_NOT_FOUND', 404, 'Academic standing not found.');
    }
    if (!academicYear) {
      throw new AppError('ACADEMIC_YEAR_NOT_FOUND', 404, 'Academic year not found.');
    }

    // *************** Resolve the block, subject, and test names from the standings
    const blockIds = standings.map(ExtractBlockId);
    const subjectIds = standings.flatMap(ExtractSubjectIdsFromStanding);
    const testIds = standings.flatMap(ExtractAllTestIdsFromStanding);

    const [blocks, subjects, tests] = await Promise.all([
      BlockModel.find({
        _id: { $in: blockIds },
        deleted_at: null,
      })
        .select('name')
        .lean(),
      SubjectModel.find({ _id: { $in: subjectIds }, deleted_at: null })
        .select('name')
        .lean(),
      TestModel.find({ _id: { $in: testIds }, deleted_at: null })
        .select('name')
        .lean(),
    ]);

    const blockNameById = new Map(blocks.map(BuildNameEntry));
    const subjectNameById = new Map(subjects.map(BuildNameEntry));
    const testNameById = new Map(tests.map(BuildNameEntry));

    // *************** Guard against missing curriculum entities
    GuardMissingIds(blockIds, blockNameById, 'BLOCK_NOT_FOUND', 'Block not found.');
    GuardMissingIds(subjectIds, subjectNameById, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    GuardMissingIds(testIds, testNameById, 'TEST_NOT_FOUND', 'Test not found.');

    // *************** Shape the template context from the fetched documents
    const reportCardBlocks = standings.map(
      MapStandingToReportCardBlock.bind(null, blockNameById, subjectNameById, testNameById),
    );

    const reportCardContext = {
      student: {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        student_number: student.student_number,
      },
      academic_year: { name: academicYear.name },
      blocks: reportCardBlocks,
      generated_at: FormatReportDate(),
    };
    return reportCardContext;
  } catch (err) {
    ReThrowHelperError(err, 'building the report card');
  }
}

// *************** END: Report Card Helper Function ***************

// *************** EXPORT MODULE ***************
module.exports = { FetchReportCardDataHelper };
