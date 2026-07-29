// *************** IMPORT LIBRARY ***************
require("dotenv").config();

// *************** IMPORT MODULE ***************
const AppError = require("../utils/app_error.util");

// *************** VALIDATE ENVIRONMENT VARIABLES ***************
if (!process.env.MONGO_URI || !process.env.PORT) {
  throw new AppError(
    "CONFIG_ERROR",
    500,
    "MONGO_URI and PORT must be defined in .env file",
  );
}

// *************** EXPORT MODULE ***************
module.exports = {
  port: process.env.PORT,
  db: {
    uri: process.env.MONGO_URI,
  },
};
