// *************** IMPORT LIBRARY ***************
const cron = require("node-cron");

// *************** IMPORT MODULE ***************
const config = require("../core/config");
const logger = require("../core/logger");
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
 * Already-notified combos and deleted/dangling students are excluded before
 * the batch `$limit`, so each tick advances to rows that still need an alert
 * instead of re-selecting the same first batch. The working set is still
 * capped to `batchSize` rows per call (students × blocks × subjects × tests
 * can grow large) and allowDiskUse prevents the 100 MB aggregation memory
 * limit from killing the job at scale. DispatchMissingGradeAlert keeps a
 * race-safe per-row persisted check as a second layer.
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

    // *************** Drop already-notified combos so the batch advances
    {
      $lookup: {
        from: "notification_logs",
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
                  { $eq: ["$type", ALERT_TYPE] },
                  { $eq: ["$student_id", "$$student_id"] },
                  { $eq: ["$test_id", "$$test_id"] },
                  { $eq: ["$academic_year_id", "$$academic_year_id"] },
                ],
              },
            },
          },
        ],
        as: "existing_alert",
      },
    },
    { $match: { existing_alert: { $size: 0 } } },

    // *************** Drop deleted/dangling students before batching
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

    // *************** Bound the working set handled by this tick
    { $limit: batchSize },

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
 * Failures carry an `err.alertStage` so the caller can tell an SMTP
 * delivery failure (nothing was sent) from a NotificationLog persistence
 * failure (the email already went out but the lock was not recorded).
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

  // *************** Dispatch the alert email (SMTP delivery stage)
  try {
    await SendEmail(
      config.alertEmail,
      SanitizeEmailSubject(
        `Missing grade: ${missing.student_name} — ${missing.test_name}`,
      ),
      htmlBody,
    );
  } catch (err) {
    err.alertStage = "smtp_delivery";
    throw err;
  }

  // *************** Lock the alert (after the email went out)
  try {
    await NotificationLogModel.create({
      type: ALERT_TYPE,
      student_id: missing.student_id,
      test_id: missing.test_id,
      academic_year_id: missing.academic_year_id,
    });
  } catch (err) {
    err.alertStage = "notification_log_persistence";
    throw err;
  }
}
// *************** END: Dispatch Alert ***************

// *************** START: Run Missing Grade Audit ***************
/**
 * Runs the audit once: finds all missing grades and dispatches an alert for
 * each one. A failing alert must not block the others.
 *
 * @param {number} [batchSize] - Maximum missing-grade rows to collect per run
 *   (defaults to config.auditBatchSize).
 * @returns {Promise<void>}
 */
async function RunMissingGradeAudit(batchSize = config.auditBatchSize) {
  // *************** Collect missing grades (bounded to batchSize)
  const missingGrades = await QueryMissingGrades(batchSize);

  // *************** Dispatch one alert per missing grade
  for (const missing of missingGrades) {
    try {
      await DispatchMissingGradeAlert(missing);
    } catch (err) {
      // *************** A lock failure means the email already went out
      const emailAlreadyDelivered =
        err.alertStage === "notification_log_persistence";
      logger.error(
        {
          operation: "missing_grades.alert",
          alert_stage: err.alertStage || "smtp_delivery",
          email_delivered: emailAlreadyDelivered,
          student_id: missing.student_id,
          test_id: missing.test_id,
          academic_year_id: missing.academic_year_id,
          err,
        },
        emailAlreadyDelivered
          ? "Missing grade alert: email delivered but idempotency lock failed"
          : "Missing grade alert failed",
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
    logger.error(
      {
        operation: "missing_grades.scheduled_run",
        err,
      },
      "Scheduled missing grade audit run failed",
    );
  }
}

/**
 * Starts the recurring missing-grade audit on boot. Safe to call once.
 */
function InitializeGradeAuditorJob() {
  // *************** Schedule the recurring run
  cron.schedule(config.auditCron, RunScheduledAudit, { noOverlap: true });
  logger.info({ operation: "missing_grades.scheduler" }, "Audit scheduled");
}
// *************** END: Initialize the Audit Job ***************

// *************** EXPORT MODULE ***************
module.exports = {
  InitializeGradeAuditorJob,
  QueryMissingGrades,
  RunMissingGradeAudit,
};
