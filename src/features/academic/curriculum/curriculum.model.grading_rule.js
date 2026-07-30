// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE GRADING RULE SCHEMA ***************
const GradingRuleSchema = new Schema(
  {
    // *************** Display label for the grading rule
    label: { type: String, required: true },
    // *************** Comparison operator to evaluate the student's score against the threshold
    operator: {
      type: String,
      required: true,
      enum: [">", ">=", "<", "<=", "=="],
    },
    // *************** Score threshold that triggers this grading rule
    threshold: { type: Number, required: true },
  },
  { _id: false },
);

// *************** EXPORT MODULE ***************
module.exports = GradingRuleSchema;
