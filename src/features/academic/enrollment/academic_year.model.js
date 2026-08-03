// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE ACADEMIC YEAR SCHEMA ***************
const AcademicYearSchema = new Schema(
  {
    // Display name of the cohort (e.g., "2025/2026")
    name: { type: String, required: true },
    // First day of the academic year
    start_date: { type: Date, required: true },
    // Last day of the academic year
    end_date: { type: Date, required: true },
    // Lifecycle status controlling enrollment eligibility
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    // Curriculum blocks offered during this academic year
    block_ids: {
      type: [Schema.Types.ObjectId],
      ref: "Block",
      validate: {
        validator: (v) => v.length > 0,
        message: "block_ids must not be empty",
      },
    },
    // Students enrolled in this academic year
    student_ids: {
      type: [Schema.Types.ObjectId],
      ref: "Student",
      default: [],
    },
    // null means active, Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "academic_years",
  },
);

AcademicYearSchema.index({ block_ids: 1 });
AcademicYearSchema.index({ student_ids: 1 });
AcademicYearSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const AcademicYearModel = mongoose.model("AcademicYear", AcademicYearSchema);

// *************** EXPORT MODULE ***************
module.exports = AcademicYearModel;
