// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** IMPORT MODULE ***************
const GradingRuleSchema = require("./curriculum.model.grading_rule");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE TEST SCHEMA ***************
const TestSchema = new Schema(
  {
    // *************** Official name of the test
    name: { type: String, required: true },
    // *************** Reference to the parent subject this test belongs to
    subject_id: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    // *************** Percentage weightage of this test within the subject (value between 0 and 100)
    weightage: { type: Number, required: true },
    // *************** Set of grading rules specific to this test
    grading_rules: [GradingRuleSchema],
    // *************** null means active, Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "tests",
  },
);

TestSchema.index({ subject_id: 1 });
TestSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const TestModel = mongoose.model("Test", TestSchema);

// *************** EXPORT MODULE ***************
module.exports = TestModel;
