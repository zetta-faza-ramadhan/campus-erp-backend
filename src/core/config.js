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
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 2525,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "alert@campus.edu",
  },
  alertEmail: process.env.ALERT_EMAIL || "alert@campus.edu",

  // *************** Schedule the missing-grade audit every minute
  auditCron: process.env.AUDIT_CRON || "* * * * *",
  // *************** Cap missing-grade rows handled per tick; the next tick resumes
  auditBatchSize: Number(process.env.AUDIT_BATCH_SIZE) || 100,
};
