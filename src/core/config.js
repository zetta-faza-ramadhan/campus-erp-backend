// *************** IMPORT LIBRARY ***************
require("dotenv").config();

// *************** IMPORT MODULE ***************
const AppError = require("./error.js");

// *************** GLOBAL VARIABLES ***************
const ALLOWED_NODE_ENVS = ["development", "production", "test"];
const nodeEnv = process.env.NODE_ENV || "development";

// *************** VALIDATE ENVIRONMENT VARIABLES ***************
if (!process.env.MONGO_URI || !process.env.PORT || !process.env.JWT_SECRET) {
  throw new AppError(
    "CONFIG_ERROR",
    500,
    "MONGO_URI, PORT and JWT_SECRET must be defined in .env file",
  );
}

if (!ALLOWED_NODE_ENVS.includes(nodeEnv)) {
  throw new AppError(
    "CONFIG_ERROR",
    500,
    "NODE_ENV must be one of development, production, test",
  );
}

// *************** EXPORT MODULE ***************
module.exports = {
  port: process.env.PORT,
  nodeEnv,
  db: {
    uri: process.env.MONGO_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
};
