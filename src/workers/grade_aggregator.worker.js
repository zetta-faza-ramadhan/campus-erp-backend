// *************** IMPORT CORE ***************
const { parentPort, workerData } = require('worker_threads');

// *************** IMPORT MODULE ***************
const AppError = require('../core/error');
const databaseConnection = require('../core/db');

// *************** IMPORT HELPER FUNCTION ***************
const { RunGradeAggregation } = require('../features/academic/grading/academic_standing.helper');

// *************** GLOBAL VARIABLES ***************
// Connection wait timeout before the worker gives up
const CONNECTION_TIMEOUT_MS = 15000;

// *************** GUARD: REQUIRE WORKER CONTEXT ***************
if (!parentPort || !workerData) {
  throw new AppError('WORKER_CONTEXT_REQUIRED', 500, 'grade_aggregator.worker.js must run as a worker thread with workerData.');
}

// *************** WORKER FUNCTIONS ***************

/**
 * Resolves the connection promise when Mongoose reports 'connected'.
 *
 * @param {Function} resolve - The Promise resolve function.
 * @param {NodeJS.Timeout} timeout - The timeout handle to clear.
 * @returns {void} Clears the timeout and resolves.
 */
function OnDatabaseConnected(resolve, timeout) {
  clearTimeout(timeout);
  resolve();
}

/**
 * Rejects the connection promise with the underlying database error.
 *
 * @param {Function} reject - The Promise reject function.
 * @param {NodeJS.Timeout} timeout - The timeout handle to clear.
 * @param {Error} err - The database error.
 * @returns {void} Clears the timeout and rejects.
 */
function OnDatabaseError(reject, timeout, err) {
  clearTimeout(timeout);
  reject(err);
}

/**
 * Rejects the connection promise when the connection wait budget is exhausted.
 *
 * @param {Function} reject - The Promise reject function.
 * @returns {void} Rejects the connection promise.
 */
function OnConnectionTimeout(reject) {
  reject(new AppError('DB_CONNECTION_TIMEOUT', 500, 'Timed out waiting for the database connection.'));
}

/**
 * Drives the connection-wait promise by arming the timeout and wiring the
 * Mongoose connection listeners to the executor's resolve/reject functions.
 *
 * @param {Function} resolve - The Promise resolve function.
 * @param {Function} reject - The Promise reject function.
 * @returns {void} Registers the timeout and the connection listeners.
 */
function WaitForConnectionExecutor(resolve, reject) {
  const timeout = setTimeout(OnConnectionTimeout, CONNECTION_TIMEOUT_MS, reject);

  databaseConnection.once('connected', OnDatabaseConnected.bind(null, resolve, timeout));
  databaseConnection.once('error', OnDatabaseError.bind(null, reject, timeout));
}

/**
 * Waits for the auto-started Mongoose connection in this worker isolate.
 *
 * @returns {Promise<void>} Resolves once the connection is ready.
 * @throws {AppError} When the connection does not become ready in time.
 */
async function WaitForDatabaseConnection() {
  if (databaseConnection.readyState === 1) return;

  await new Promise(WaitForConnectionExecutor);
}

/**
 * Handles an unhandled rejection from the worker entry point by
 * reporting the failure to the main thread and closing the DB handle.
 *
 * @param {Error} err - The error that caused the worker to fail.
 * @returns {Promise<void>} Resolves once the DB handle is closed.
 */
async function HandleWorkerFailure(err) {
  parentPort.postMessage({ status: 'error', message: err.message });
  process.exitCode = 1;
  await databaseConnection.close();
}

// *************** WORKER ENTRY POINT ***************

/**
 * Worker entry point: decodes the payload, computes the standings off the
 * main thread, persists them, and reports the outcome to the main thread.
 *
 * @returns {Promise<void>} Resolves once the aggregation has been reported.
 */
async function Run() {
  // *************** Decode the stringified payload
  const { student_ids: studentIds, test_ids: testIds, academic_year_id: academicYearId } = JSON.parse(workerData);

  await WaitForDatabaseConnection();

  // *************** Aggregate the standings for the graded students
  await RunGradeAggregation({ studentIds, testIds, academicYearId });

  parentPort.postMessage({ status: 'success' });
  // *************** Close the DB handle so the worker exits cleanly
  await databaseConnection.close();
}

Run().catch(HandleWorkerFailure);
