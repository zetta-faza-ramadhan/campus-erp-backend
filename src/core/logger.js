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

// *************** WORKER EVENT LISTENER HELPER ***************

/**
 * Attaches standard error/message/exit listeners to a worker thread
 * that log via pino. Intentionally not awaited — fire-and-forget.
 *
 * @param {import("worker_threads").Worker} worker - The spawned worker instance.
 * @param {string} operation - Label for log correlation (e.g. "grade_aggregator").
 */
function AttachWorkerListeners(worker, operation) {
  worker.on("error", (err) => {
    logger.error({ operation, err }, `${operation} worker crashed`);
  });

  worker.on("message", (message) => {
    if (message?.status === "error") {
      logger.error(
        { operation, message: message.message },
        `${operation} worker failed`,
      );
      return;
    }
    logger.info({ operation }, `${operation} worker finished`);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      logger.error(
        { operation, exit_code: code },
        `${operation} worker exited abnormally`,
      );
    }
  });
}

// *************** EXPORT MODULE ***************
logger.AttachWorkerListeners = AttachWorkerListeners;
module.exports = logger;
