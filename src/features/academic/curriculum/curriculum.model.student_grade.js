// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE STUDENT GRADE SCHEMA ***************
const StudentGradeSchema = new Schema(
  {
    // Reference to the block this grade belongs to
    block_id: {
      type: Schema.Types.ObjectId,
      ref: "Block",
      required: true,
    },
    // Reference to the subject this grade belongs to
    subject_id: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Reference to the test this grade belongs to
    test_id: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    // Reference to the student receiving this grade
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // The numeric score achieved by the student
    score: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "student_grades",
  },
);

StudentGradeSchema.index({ block_id: 1 });
StudentGradeSchema.index({ subject_id: 1 });
StudentGradeSchema.index({ test_id: 1 });
StudentGradeSchema.index({ student_id: 1 });

// *************** DEFINE MODEL ***************
const StudentGradesModel = mongoose.model("StudentGrade", StudentGradeSchema);

// *************** EXPORT MODULE ***************
module.exports = StudentGradesModel;
