// *************** IMPORT LIBRARY ***************
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// *************** IMPORT MODULE ***************
const AppError = require("../../../core/error");
const UserModel = require("../user/user.model");
const config = require("../../../core/config");
const { ValidateAndSanitizeLogin } = require("./auth.validator");

// *************** GLOBAL VARIABLES ***************
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;
const DUMMY_PASSWORD_HASH =
  "$2b$10$P4VVqjeWA2M5oUxL7aNqleheTH5JjCpr60KdRtrXFnEaZW2tZmcVe";

// *************** START: LoginHelper ***************

/**
 * Authenticates a user by email and password, returns a JWT.
 *
 * @param {Object} input - Raw login payload (re-validated internally).
 * @param {string} input.email - User's email.
 * @param {string} input.password - User's plaintext password.
 * @returns {Promise<string>} Signed JWT token.
 * @throws {AppError} 401 - Invalid email or password.
 */
async function LoginHelper({ email, password }) {
  // *************** Validate input
  ValidateAndSanitizeLogin({ email, password });

  // *************** Find user by email
  const user = await UserModel.findOne({ email, deleted_at: null })
    .select("email password role")
    .lean();
  if (!user) {
    // *************** Equalize timing by hashing against a dummy password
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw new AppError(
      "INVALID_CREDENTIALS",
      401,
      "Invalid email or password.",
    );
  }

  // *************** Compare password with hash
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      401,
      "Invalid email or password.",
    );
  }
  // *************** Sign JWT with userId and role
  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return token;
}
// *************** END: LoginHelper ***************

// *************** EXPORT MODULE ***************
module.exports = { LoginHelper };
