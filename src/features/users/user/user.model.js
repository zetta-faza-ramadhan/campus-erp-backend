// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE USER SCHEMA ***************
const UserSchema = new Schema(
  {
    // User's first name
    first_name: { type: String, required: true },
    // User's last name
    last_name: { type: String, required: true },
    // Institutional email used for login and communication
    email: { type: String, required: true, unique: true },
    // User's password (hashed)
    password: { type: String, required: true },
    // User's role in the system (e.g., 'ADMIN', 'TEACHER')
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "TEACHER"],
    },
    // null means active, Date means deleted
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "users",
  },
);

UserSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const UserModel = mongoose.model("User", UserSchema);

// *************** EXPORT MODULE ***************
module.exports = UserModel;
