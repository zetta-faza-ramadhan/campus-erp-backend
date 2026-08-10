// *************** IMPORT LIBRARY ***************
const pino = require("pino");

// *************** IMPORT MODULE ***************
const config = require("./config");

// *************** CREATE STRUCTURED LOGGER ***************
/**
 * Application-wide structured logger built on pino.
 *
 * Emits JSON lines with a timestamp, severity level, service name, and a
 * binding that carries the operation label for correlation. In development
 * the output is piped through pino-pretty for readability; in production it
 * stays raw structured JSON. pino is the approved logger for production
 * code; console.* is not used in business logic or background jobs.
 */
const transport =
  config.nodeEnv === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false,
          ignore: "pid,hostname",
        },
      }
    : undefined;

const logger = pino({
  name: "campus-erp",
  level: config.nodeEnv === "test" ? "silent" : "info",
  base: { service: "campus-erp-backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});

// *************** EXPORT MODULE ***************
module.exports = logger;
