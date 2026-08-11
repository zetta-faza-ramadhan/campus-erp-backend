// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE STANDING TEST SUB-SCHEMA ***************
const StandingTestSchema = new Schema(
  {
    // Reference to the test whose standing was computed
    test_id: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    // Total mark the student achieved on this test
    total_mark: { type: Number, required: true },
    // Computed PASS/FAIL/RETAKE standing for this test
    test_status: {
      type: String,
      required: true,
      enum: ['PASS', 'FAIL', 'RETAKE'],
    },
  },
  { _id: false },
);

// *************** DEFINE STANDING SUBJECT SUB-SCHEMA ***************
const StandingSubjectSchema = new Schema(
  {
    // Reference to the subject whose standing was computed
    subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    // Average mark the student achieved across the subject's tests
    subject_average: { type: Number, required: true },
    // Computed PASS/FAIL/RETAKE standing for this subject
    subject_status: {
      type: String,
      required: true,
      enum: ['PASS', 'FAIL', 'RETAKE'],
    },
    // Per-test breakdown used to roll up the subject average
    tests: [StandingTestSchema],
  },
  { _id: false },
);

// *************** DEFINE ACADEMIC STANDING SCHEMA ***************
const AcademicStandingSchema = new Schema(
  {
    // Reference to the student this standing summary belongs to
    student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    // Reference to the academic year the standing was computed for
    academic_year_id: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    // Reference to the block whose average determines the block standing
    block_id: { type: Schema.Types.ObjectId, ref: 'Block', required: true },
    // Average mark the student achieved across the block's subjects
    block_average: { type: Number, required: true },
    // Computed PASS/FAIL/RETAKE standing for this block
    block_status: {
      type: String,
      required: true,
      enum: ['PASS', 'FAIL', 'RETAKE'],
    },
    // Per-subject breakdown used to roll up the block average
    subjects: [StandingSubjectSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'academic_standings',
  },
);

// One standing document per (student, academic year, block) — the upsert lock
AcademicStandingSchema.index({ student_id: 1, academic_year_id: 1, block_id: 1 }, { unique: true });

// *************** DEFINE MODEL ***************
const AcademicStandingModel = mongoose.model('AcademicStanding', AcademicStandingSchema);

// *************** EXPORT MODULE ***************
module.exports = AcademicStandingModel;
