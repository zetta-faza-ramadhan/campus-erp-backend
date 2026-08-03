// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** IMPORT MODULE ***************
const GradingRuleSchema = require("./curriculum.model.grading_rule");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE SUBJECT SCHEMA ***************
const SubjectSchema = new Schema(
  {
    // Official name of the subject
    name: { type: String, required: true },
    // Reference to the parent block this subject belongs to
    block_id: { type: Schema.Types.ObjectId, ref: "Block", required: true },
    // Percentage weightage of this subject within the block (value between 0 and 100)
    weightage: { type: Number, required: true },
    // Set of grading rules specific to this subject
    grading_rules: [GradingRuleSchema],
    // null means active, Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "subjects",
  },
);

SubjectSchema.index({ block_id: 1 });
SubjectSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const SubjectModel = mongoose.model("Subject", SubjectSchema);

// *************** EXPORT MODULE ***************
module.exports = SubjectModel;
