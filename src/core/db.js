// *************** IMPORT LIBRARY ***************
const mongoose = require("mongoose");

// *************** IMPORT MODULE ***************
const config = require("./config");

/**
 * Connects to MongoDB using the configured URI from config.js.
 *
 * @returns {Promise<void>} Resolves when the connection is established.
 */
async function ConnectDatabase() {
  // Connect to MongoDB using Mongoose
  await mongoose.connect(config.db.uri);
}

// *************** CONNECT DATABASE ***************
ConnectDatabase().catch((err) => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
});

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// *************** EXPORT MODULE ***************
module.exports = mongoose.connection;
