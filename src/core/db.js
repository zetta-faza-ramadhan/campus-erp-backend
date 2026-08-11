// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** IMPORT MODULE ***************
const config = require("./config");
const logger = require("./logger");

/**
 * Connects to MongoDB using the configured URI from config.js.
 *
 * @returns {Promise<void>} Resolves when the connection is established.
 */
async function ConnectDatabase() {
  // *************** Connect to MongoDB using Mongoose
  await mongoose.connect(config.db.uri);
}

// *************** CONNECT DATABASE ***************
ConnectDatabase().catch((err) => {
  logger.error({ err }, "Failed to connect to MongoDB");
  process.exit(1);
});

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  logger.error({ err }, "MongoDB connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.info("MongoDB disconnected");
});

// *************** EXPORT MODULE ***************
module.exports = mongoose.connection;
