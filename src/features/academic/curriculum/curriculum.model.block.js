// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** IMPORT MODULE ***************
const GradingRuleSchema = require('./curriculum.model.grading_rule');

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE BLOCK SCHEMA ***************
const BlockSchema = new Schema(
  {
    // Official name of the academic block
    name: { type: String, required: true },
    // Academic year this block belongs to (e.g., "2023-2024")
    academic_year: { type: String, required: true },
    // Set of grading rules applied to this block
    grading_rules: [GradingRuleSchema],
    // null is active and Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'blocks',
  },
);

BlockSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const BlockModel = mongoose.model('Block', BlockSchema);

// *************** EXPORT MODULE ***************
module.exports = BlockModel;
