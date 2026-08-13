// *************** IMPORT CORE ***************
const { Readable } = require('stream');

// *************** IMPORT LIBRARY ***************
const puppeteer = require('puppeteer');

// *************** IMPORT MODULE ***************
const AppError = require('../../core/error');
const logger = require('../../core/logger');

// *************** GLOBAL VARIABLES ***************
let browserInstance = null;

// *************** INITIALIZE PDF SERVICE ***************

/**
 * Launches the headless browser exactly once and caches the singleton
 * instance. Safe to call repeatedly: subsequent calls return the cached
 * browser. Intended to run at boot, never from a request path.
 *
 * @returns {Promise<Object>} The Puppeteer Browser instance.
 * @throws {Error} If the headless browser fails to launch.
 */
async function InitializePDFService() {
  if (browserInstance) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({ headless: 'new' });
  logger.info('Headless Chrome launched for PDF generation');
  return browserInstance;
}

// *************** PAGE LIFECYCLE ***************

/**
 * Creates an idempotent page-closing function for a Puppeteer page, safe to
 * call from stream listeners and the try/catch/finally cleanup without racing.
 *
 * @param {import('puppeteer').Page} page - The page to close once.
 * @returns {Function} An idempotent closer; later calls are no-ops.
 */
function CreatePageCloser(page) {
  let pageClosed = false;

  /**
   * Closes the page on the first call and swallows close errors (the page may
   * already be gone if the browser crashed).
   *
   * @returns {void}
   */
  function ClosePage() {
    if (pageClosed) {
      return;
    }
    pageClosed = true;
    page.close().catch(() => {});
  }

  return ClosePage;
}

// *************** GENERATE PDF STREAM ***************

/**
 * Renders the compiled HTML into a PDF stream on the given page.
 *
 * @param {import('puppeteer').Page} page - The page to render with.
 * @param {string} htmlContent - Fully compiled HTML to convert to a PDF.
 * @returns {Promise<import('stream').Readable>} A readable PDF byte stream.
 */
async function RenderPDFStream(page, htmlContent) {
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  return Readable.fromWeb(await page.createPDFStream({ format: 'A4', printBackground: true }));
}

/**
 * Attaches the idempotent page closer to the PDF stream's end and error events
 * so the page is freed exactly once when the stream finishes, whether it
 * completes or fails.
 *
 * @param {import('stream').Readable} stream - The PDF byte stream.
 * @param {Function} closePage - The idempotent page closer.
 * @returns {import('stream').Readable} The same stream, ready to be consumed.
 */
function AttachPageCleanup(stream, closePage) {
  stream.on('end', closePage);
  stream.on('error', closePage);
  return stream;
}

/**
 * Renders fully-compiled HTML into a PDF stream.
 *
 * Guarantees the page is always closed — on stream end/error via the listeners,
 * or in the catch/finally when rendering fails before a stream is produced.
 *
 * @param {string} htmlContent - Fully rendered HTML to convert to a PDF.
 * @returns {Promise<import('stream').Readable>} A readable PDF byte stream.
 * @throws {AppError} 500 - The PDF service was not initialized during boot.
 * @throws {Error} If the browser fails to render the HTML into a PDF.
 */
async function GeneratePDFStream(htmlContent) {
  if (!browserInstance) {
    throw new AppError('PDF_SERVICE_NOT_INITIALIZED', 500, 'PDF service is not initialized. Call InitializePDFService() during boot.');
  }

  const page = await browserInstance.newPage();
  const closePage = CreatePageCloser(page);
  let pdfStream = null;

  try {
    // *************** Render the PDF stream on the page
    const renderedStream = await RenderPDFStream(page, htmlContent);
    // *************** Wire the page closer to the stream lifecycle
    pdfStream = AttachPageCleanup(renderedStream, closePage);
    return pdfStream;
  } catch (err) {
    // *************** Rendering failed before a stream existed — close the page
    closePage();
    throw err;
  } finally {
    // *************** Guarantee page.close() when no stream was handed off
    if (!pdfStream) {
      closePage();
    }
  }
}

// *************** EXPORT MODULE ***************
module.exports = { InitializePDFService, GeneratePDFStream };
