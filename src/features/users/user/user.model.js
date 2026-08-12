// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** GLOBAL VARIABLES ***************
const Schema = mongoose.Schema;

// *************** DEFINE USER SCHEMA ***************
const UserSchema = new Schema(
  {
    // User's first name; displayed in UI, reports, and audit logs
    first_name: { type: String, required: true },
    // User's last name; displayed in UI, reports, and audit logs
    last_name: { type: String, required: true },
    // Institutional email used for login and communication
    email: { type: String, required: true, unique: true },
    // User's password (bcrypt-hashed); compared during Login mutation for authentication
    password: { type: String, required: true },
    // User's role in the system (ADMIN or TEACHER); determines access level via the @auth directive
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'TEACHER'],
    },
    // Soft-delete timestamp; null means active, Date means deleted; queries filter on null to exclude deleted records
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users',
  },
);

UserSchema.index({ deleted_at: 1 });

// *************** DEFINE MODEL ***************
const UserModel = mongoose.model('User', UserSchema);

// *************** EXPORT MODULE ***************
module.exports = UserModel;
