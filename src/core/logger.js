// *************** IMPORT LIBRARY ***************
const pino = require('pino');

// *************** IMPORT MODULE ***************
const config = require('./config');

// *************** CREATE STRUCTURED LOGGER ***************
/**
 * Application-wide structured logger built on pino.
 *
 * Emits JSON lines with a timestamp, severity level, service name, and a
 * binding that carries the operation label for correlation. pino is the approved logger for production
 * code; console.* is not used in business logic or background jobs.
 */

const logger = pino({
  name: 'campus-erp',
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  base: { service: 'campus-erp-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// *************** WORKER EVENT LISTENER HELPER ***************

/**
 * Handles the 'error' event from a worker thread by logging the crash.
 *
 * @param {Object} context - The bound correlation context.
 * @param {string} context.operation - The operation label for log correlation.
 * @param {Error} err - The error that caused the worker to crash.
 * @returns {void}
 */
function HandleWorkerError({ operation }, err) {
  logger.error({ operation, err }, `${operation} worker crashed`);
}

/**
 * Handles the 'message' event from a worker thread by logging the outcome.
 *
 * @param {Object} context - The bound correlation context.
 * @param {string} context.operation - The operation label for log correlation.
 * @param {{ status?: string, message?: string }} message - The message payload from the worker.
 * @returns {void}
 */
function HandleWorkerMessage({ operation }, message) {
  if (message?.status === 'error') {
    logger.error({ operation, message: message.message }, `${operation} worker failed`);
    return;
  }
  logger.info({ operation }, `${operation} worker finished`);
}

/**
 * Handles the 'exit' event from a worker thread by logging abnormal exits.
 *
 * @param {Object} context - The bound correlation context.
 * @param {string} context.operation - The operation label for log correlation.
 * @param {number} code - The exit code.
 * @returns {void}
 */
function HandleWorkerExit({ operation }, code) {
  if (code !== 0) {
    logger.error({ operation, exit_code: code }, `${operation} worker exited abnormally`);
  }
}

/**
 * Attaches standard error/message/exit listeners to a worker thread
 * that log via pino. Intentionally not awaited — fire-and-forget.
 *
 * @param {import("worker_threads").Worker} worker - The spawned worker instance.
 * @param {string} operation - Label for log correlation (e.g. "grade_aggregator").
 * @returns {void}
 */
function AttachWorkerListeners(worker, operation) {
  const context = { operation };
  worker.on('error', HandleWorkerError.bind(null, context));
  worker.on('message', HandleWorkerMessage.bind(null, context));
  worker.on('exit', HandleWorkerExit.bind(null, context));
}

// *************** EXPORT MODULE ***************
logger.AttachWorkerListeners = AttachWorkerListeners;
module.exports = logger;
