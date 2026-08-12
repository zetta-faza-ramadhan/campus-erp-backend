// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE STUDENT SCHEMA ***************
const StudentSchema = new Schema(
  {
    // Student's first name
    first_name: { type: String, required: true },
    // Student's last name
    last_name: { type: String, required: true },
    // Institutional email used for login and communication
    email: { type: String, required: true, unique: true },
    // Official student number assigned by the institution (e.g., "ZB-2026-001")
    student_number: { type: String, required: true, unique: true },
    // Date the student profile was registered
    registration_date: { type: Date, default: Date.now },
    // Academic years this student has been enrolled in
    academic_year_ids: {
      type: [Schema.Types.ObjectId],
      ref: 'AcademicYear',
      default: [],
    },
    // null means active, Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'students',
  },
);

StudentSchema.index({ academic_year_ids: 1 });
StudentSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const StudentModel = mongoose.model('Student', StudentSchema);

// *************** EXPORT MODULE ***************
module.exports = StudentModel;
