// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE NOTIFICATION LOG SCHEMA ***************
const NotificationLogSchema = new Schema(
  {
    // Category of notification; currently only missing-grade alerts
    type: {
      type: String,
      required: true,
      enum: ["MISSING_GRADE_ALERT"],
    },
    // Reference to the student who is missing a grade
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // Reference to the test the student missed
    test_id: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    // Reference to the academic year the missing grade belongs to
    academic_year_id: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "notification_logs",
  },
);

// One alert per (type, student, test, year) — the idempotency lock
NotificationLogSchema.index(
  { type: 1, student_id: 1, test_id: 1, academic_year_id: 1 },
  { unique: true },
);

// *************** DEFINE MODEL ***************
const NotificationLogModel = mongoose.model(
  "NotificationLog",
  NotificationLogSchema,
);

// *************** EXPORT MODULE ***************
module.exports = NotificationLogModel;
