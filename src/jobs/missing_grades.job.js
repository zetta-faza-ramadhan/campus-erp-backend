// *************** IMPORT LIBRARY ***************
const cron = require("node-cron");

// *************** IMPORT MODULE ***************
const config = require("../core/config");
const AcademicYearModel = require("../features/academic/enrollment/academic_year.model");
const NotificationLogModel = require("../features/system/notifications/notification_log.model");
const { SendEmail } = require("../shared/services/email.service");

// *************** IMPORT VALIDATOR ***************
const {
  EscapeHtml,
  SanitizeEmailSubject,
} = require("../shared/validator/email.validator");

// *************** GLOBAL VARIABLES ***************
const ALERT_TYPE = "MISSING_GRADE_ALERT";

// *************** QUERY: FIND MISSING GRADES ***************
/**
 * Scans active academic years and returns every (student, test) combination
 * that has no matching StudentGrade yet, along with the details needed
 * to render and dispatch the alert email.
 *
 * The pipeline is bounded to `batchSize` rows per call: the four expansion
 * stages can produce a large intermediate working set (students × blocks ×
 * subjects × tests), so the $limit caps the materialised result and
 * allowDiskUse prevents the 100 MB aggregation memory limit from killing
 * the job at scale. Unprocessed rows are picked up on the next tick because
 * DispatchMissingGradeAlert durably records each alert in the log.
 *
 * @param {number} [batchSize] - Maximum missing-grade rows to return per call.
 * @returns {Promise<Array<Object>>} Missing-grade rows with student/test/year details.
 */
async function QueryMissingGrades(batchSize = config.auditBatchSize) {
  return AcademicYearModel.aggregate([
    // *************** Only keep active, non-deleted academic years
    { $match: { status: "ACTIVE", deleted_at: null } },

    // *************** Expand one row per enrolled student
    { $unwind: "$student_ids" },

    // *************** Expand one row per block offered that year
    { $unwind: "$block_ids" },

    // *************** Resolve the subjects belonging to this block
    {
      $lookup: {
        from: "subjects",
        let: { block_id: "$block_ids" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$block_id", "$$block_id"] },
                  { $eq: ["$deleted_at", null] },
                ],
              },
            },
          },
        ],
        as: "subjects",
      },
    },
    { $unwind: "$subjects" },

    // *************** Resolve the tests belonging to this subject
    {
      $lookup: {
        from: "tests",
        let: { subject_id: "$subjects._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$subject_id", "$$subject_id"] },
                  { $eq: ["$deleted_at", null] },
                ],
              },
            },
          },
        ],
        as: "tests",
      },
    },
    { $unwind: "$tests" },

    // *************** Look for a grade on (student, test, academic year)
    {
      $lookup: {
        from: "student_grades",
        let: {
          student_id: "$student_ids",
          test_id: "$tests._id",
          academic_year_id: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$student_id", "$$student_id"] },
                  { $eq: ["$test_id", "$$test_id"] },
                  { $eq: ["$academic_year_id", "$$academic_year_id"] },
                ],
              },
            },
          },
        ],
        as: "grade",
      },
    },

    // *************** Keep only rows that have no grade
    { $match: { grade: { $size: 0 } } },

    // *************** Bound the working set handled by this tick
    { $limit: batchSize },

    // *************** Resolve the student profile for the email body
    {
      $lookup: {
        from: "students",
        let: { student_id: "$student_ids" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$student_id"] },
                  { $eq: ["$deleted_at", null] },
                ],
              },
            },
          },
        ],
        as: "student",
      },
    },
    { $unwind: "$student" },

    // *************** Shape the row for the dispatch step
    {
      $project: {
        _id: 0,
        academic_year_id: "$_id",
        academic_year_name: "$name",
        student_id: "$student_ids",
        student_name: {
          $concat: ["$student.first_name", " ", "$student.last_name"],
        },
        student_email: "$student.email",
        test_id: "$tests._id",
        test_name: "$tests.name",
        subject_name: "$subjects.name",
      },
    },
  ]).allowDiskUse(true);
}

// *************** START: Dispatch Alert ***************
/**
 * Sends the missing grade alert for one row and records it in the
 * notification log so the same alert is never dispatched twice.
 *
 * @param {Object} missing - A single missing-grade row from QueryMissingGrades.
 * @returns {Promise<void>}
 */
async function DispatchMissingGradeAlert(missing) {
  // *************** Skip if this exact alert was already sent
  const alreadySent = await NotificationLogModel.exists({
    type: ALERT_TYPE,
    student_id: missing.student_id,
    test_id: missing.test_id,
    academic_year_id: missing.academic_year_id,
  });
  if (alreadySent) return;

  // *************** Build the HTML email body
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2>Missing Grade Alert</h2>
      <p>The following student has not received a grade for a scheduled test:</p>
      <table style="border-collapse: collapse;">
        <tbody>
          <tr><td><strong>Student:</strong></td><td>${EscapeHtml(missing.student_name)}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${EscapeHtml(missing.student_email)}</td></tr>
          <tr><td><strong>Test:</strong></td><td>${EscapeHtml(missing.test_name)}</td></tr>
          <tr><td><strong>Subject:</strong></td><td>${EscapeHtml(missing.subject_name)}</td></tr>
          <tr><td><strong>Academic Year:</strong></td><td>${EscapeHtml(missing.academic_year_name)}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // *************** Dispatch the alert email
  await SendEmail(
    config.alertEmail,
    SanitizeEmailSubject(
      `Missing grade: ${missing.student_name} — ${missing.test_name}`,
    ),
    htmlBody,
  );

  // *************** Lock the alert so it won't be resent on the next run
  await NotificationLogModel.create({
    type: ALERT_TYPE,
    student_id: missing.student_id,
    test_id: missing.test_id,
    academic_year_id: missing.academic_year_id,
  });
}
// *************** END: Dispatch Alert ***************

// *************** START: Run Missing Grade Audit ***************
/**
 * Runs the audit once: finds all missing grades and dispatches an alert for
 * each one. A failing alert must not block the others.
 *
 * @returns {Promise<void>}
 */
async function RunMissingGradeAudit() {
  // *************** Collect all missing grades
  const missingGrades = await QueryMissingGrades();

  // *************** Dispatch one alert per missing grade
  for (const missing of missingGrades) {
    try {
      await DispatchMissingGradeAlert(missing);
    } catch (err) {
      console.error(
        `[GradeAudit] Alert failed for ${missing.student_name}/${missing.test_name}: ${err.message}`,
      );
    }
  }
}
// *************** END: Run Missing Grade Audit ***************

// *************** START: Initialize the Audit Job ***************
/**
 * Runs the scheduled audit and logs a failure instead of crashing the
 * cron scheduler when an unexpected error occurs.
 *
 * @returns {Promise<void>}
 */
async function RunScheduledAudit() {
  try {
    await RunMissingGradeAudit();
  } catch (err) {
    console.error(`[GradeAudit] Scheduled run failed: ${err.message}`);
  }
}

/**
 * Starts the recurring missing-grade audit on boot. Safe to call once.
 */
function InitializeGradeAuditorJob() {
  // *************** Schedule the recurring run
  cron.schedule(config.auditCron, RunScheduledAudit, { noOverlap: true });
  console.log(`[GradeAudit] Scheduled every "${config.auditCron}"`);
}
// *************** END: Initialize the Audit Job ***************

// *************** EXPORT MODULE ***************
module.exports = {
  InitializeGradeAuditorJob,
  QueryMissingGrades,
  RunMissingGradeAudit,
};
