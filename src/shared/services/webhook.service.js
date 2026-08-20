// *************** IMPORT MODULE ***************
const AppError = require('../../core/error');
const config = require('../../core/config');
const logger = require('../../core/logger');

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeDispatchAcademicStandings } = require('../../features/academic/grading/webhook.validator');

// *************** GLOBAL VARIABLES ***************
// *************** Cap how long a webhook dispatch may run; a hang must not stall the worker
const WEBHOOK_DISPATCH_TIMEOUT_MS = 5000;

// *************** WEBHOOK DISPATCH ***************

/**
 * Dispatches the freshly-computed academic standings to the external data
 * warehouse via a fire-and-forget POST request.
 *
 * Fire-and-forget by design: a failing external endpoint must never crash the
 * internal grading pipeline. The caller's bulkWrite has already succeeded by
 * the time this runs, so any webhook failure is logged and swallowed — the
 * error is never re-thrown back to the worker.
 *
 * @param {Array<Object>} standingsArray - The fully-mapped computed standings
 *   (averages, statuses, per-subject breakdowns), not the raw updateOne ops.
 * @returns {Promise<void>} Resolves when the request has been dispatched or
 *   the failure has been logged and swallowed.
 */
async function DispatchAcademicStandings(standingsArray) {
  try {
    // *************** Validate input
    const value = ValidateAndSanitizeDispatchAcademicStandings({
      standingsArray,
      warehouseUrl: config.webhook.warehouseUrl,
    });
    standingsArray = value.standingsArray;
    const warehouseUrl = value.warehouseUrl;

    // *************** Authenticate against the warehouse when an API key is configured
    const headers = { 'Content-Type': 'application/json' };
    if (config.webhook.warehouseApiKey) {
      headers['x-api-key'] = config.webhook.warehouseApiKey;
    }

    // *************** POST the standings payload to the warehouse endpoint
    const response = await fetch(warehouseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'ACADEMIC_STANDINGS_UPDATED',
        timestamp: new Date().toISOString(),
        data: standingsArray,
      }),
      signal: AbortSignal.timeout(WEBHOOK_DISPATCH_TIMEOUT_MS),
    });
    // *************** Surface non-2xx responses as errors into the catch block
    if (!response.ok) {
      throw new AppError('WEBHOOK_DISPATCH_FAILED', response.status, 'Webhook endpoint returned a non-OK status.');
    }
    // *************** Drain the body so the keep-alive socket returns to the pool
    await response.text();
  } catch (err) {
    logger.error({ operation: 'webhook.warehouse', err }, 'Failed to dispatch webhook');
  }
}

// *************** EXPORT MODULE ***************
module.exports = { DispatchAcademicStandings };
