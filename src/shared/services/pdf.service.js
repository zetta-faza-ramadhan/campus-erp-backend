// *************** IMPORT CORE ***************
const { Readable } = require('stream');

// *************** IMPORT LIBRARY ***************
const puppeteer = require('puppeteer');

// *************** IMPORT MODULE ***************
const AppError = require('../../core/error');
const logger = require('../../core/logger');

// *************** IMPORT HELPER FUNCTION ***************
const { ReThrowHelperError } = require('../../core/helper_error');

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
  try {
    if (browserInstance) {
      return browserInstance;
    }
    browserInstance = await puppeteer.launch({ headless: true });
    logger.info('Headless Chrome launched for PDF generation');
    return browserInstance;
  } catch (err) {
    ReThrowHelperError(err, 'initializing the PDF service');
  }
}

// *************** PAGE LIFECYCLE ***************

/**
 * Creates an idempotent page-closing function for a Puppeteer page, safe to
 * call from stream listeners and the try/catch/finally cleanup without racing.
 *
 * @param {import('puppeteer').Page} page - The page to close once.
 * @returns {Function} An idempotent closer; later calls are no-ops.
 * @throws {AppError} 400 - The page is missing or not a valid Puppeteer page.
 */
function CreatePageCloser(page) {
  try {
    if (!page || typeof page.close !== 'function') {
      throw new AppError('INVALID_PDF_PAGE', 400, 'A valid Puppeteer page is required.');
    }

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
  } catch (err) {
    ReThrowHelperError(err, 'creating the page closer');
  }
}

// *************** GENERATE PDF STREAM ***************

/**
 * Renders the compiled HTML into a PDF stream on the given page.
 *
 * @param {import('puppeteer').Page} page - The page to render with.
 * @param {string} htmlContent - Fully compiled HTML to convert to a PDF.
 * @returns {Promise<import('stream').Readable>} A readable PDF byte stream.
 * @throws {AppError} 400 - The page or HTML content is invalid.
 */
async function RenderPDFStream(page, htmlContent) {
  try {
    if (!page || typeof page.setContent !== 'function') {
      throw new AppError('INVALID_PDF_PAGE', 400, 'A valid Puppeteer page is required.');
    }
    if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      throw new AppError('INVALID_PDF_CONTENT', 400, 'PDF content must be a non-empty string.');
    }
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfStream = Readable.fromWeb(await page.createPDFStream({ format: 'A4', printBackground: true }));
    return pdfStream;
  } catch (err) {
    ReThrowHelperError(err, 'rendering the PDF stream');
  }
}

/**
 * Attaches the idempotent page closer to the PDF stream's end and error events
 * so the page is freed exactly once when the stream finishes, whether it
 * completes or fails.
 *
 * @param {import('stream').Readable} stream - The PDF byte stream.
 * @param {Function} closePage - The idempotent page closer.
 * @returns {import('stream').Readable} The same stream, ready to be consumed.
 * @throws {AppError} 400 - The stream or page closer is invalid.
 */
function AttachPageCleanup(stream, closePage) {
  try {
    if (!stream || typeof stream.on !== 'function') {
      throw new AppError('INVALID_PDF_STREAM', 400, 'A valid PDF stream is required.');
    }
    if (typeof closePage !== 'function') {
      throw new AppError('INVALID_PAGE_CLOSER', 400, 'A valid page closer is required.');
    }
    stream.on('end', closePage);
    stream.on('error', closePage);
    return stream;
  } catch (err) {
    ReThrowHelperError(err, 'attaching the page cleanup');
  }
}

/**
 * Renders fully-compiled HTML into a PDF stream.
 *
 * Guarantees the page is always closed — on stream end/error via the listeners,
 * or in the catch/finally when rendering fails before a stream is produced.
 *
 * @param {string} htmlContent - Fully rendered HTML to convert to a PDF.
 * @returns {Promise<import('stream').Readable>} A readable PDF byte stream.
 * @throws {AppError} 400 - The HTML content is invalid.
 * @throws {AppError} 500 - The PDF service was not initialized during boot.
 */
async function GeneratePDFStream(htmlContent) {
  try {
    if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      throw new AppError('INVALID_PDF_CONTENT', 400, 'PDF content must be a non-empty string.');
    }
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
  } catch (err) {
    ReThrowHelperError(err, 'generating the PDF stream');
  }
}

// *************** EXPORT MODULE ***************
module.exports = { InitializePDFService, GeneratePDFStream };
