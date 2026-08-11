// *************** IMPORT LIBRARY ***************
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
 * Waits for the auto-started Mongoose connection in this worker isolate.
 *
 * @returns {Promise<void>} Resolves once the connection is ready.
 * @throws {AppError} When the connection does not become ready in time.
 */
async function WaitForDatabaseConnection() {
  if (databaseConnection.readyState === 1) return;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new AppError('DB_CONNECTION_TIMEOUT', 500, 'Timed out waiting for the database connection.'));
    }, CONNECTION_TIMEOUT_MS);

    databaseConnection.once('connected', () => {
      clearTimeout(timeout);
      resolve();
    });
    databaseConnection.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// *************** WORKER ENTRY POINT ***************

/**
 * Worker entry point: decodes the payload, computes the standings off the
 * main thread, persists them, and reports the outcome to the main thread.
 *
 * @returns {Promise<void>} Resolves once the aggregation has been reported.
 */
async function Run() {
  // *************** Decode the stringified payload into camelCase params
  const { student_ids: studentIds, test_id: testId, academic_year_id: academicYearId } = JSON.parse(workerData);

  await WaitForDatabaseConnection();

  // *************** Aggregate the standings for the graded students
  await RunGradeAggregation({ studentIds, testId, academicYearId });

  parentPort.postMessage({ status: 'success' });
  // *************** Close the DB handle so the worker exits cleanly
  await databaseConnection.close();
}

Run().catch(async (err) => {
  parentPort.postMessage({ status: 'error', message: err.message });
  process.exitCode = 1;
  await databaseConnection.close();
});
