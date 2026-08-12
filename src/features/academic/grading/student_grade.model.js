// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE STUDENT GRADE SCHEMA ***************
const StudentGradeSchema = new Schema(
  {
    // Reference to the student receiving this grade
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    // Reference to the test this score is for
    test_id: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    // Reference to the academic year the grade was recorded in
    academic_year_id: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    // Numeric score achieved, 0-100
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'student_grades',
  },
);

StudentGradeSchema.index({ student_id: 1, test_id: 1, academic_year_id: 1 }, { unique: true });

// *************** DEFINE MODEL ***************
const StudentGradeModel = mongoose.model('StudentGrade', StudentGradeSchema);

// *************** EXPORT MODULE ***************
module.exports = StudentGradeModel;
