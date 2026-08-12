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

// *************** GENERATE PDF STREAM ***************

/**
 * Renders fully-compiled HTML into a PDF and returns it as a readable stream.
 *
 * Guarantees the page opened on the shared browser is always closed — on
 * stream completion ('end'), on stream failure ('error'), or if rendering
 * fails before a stream is produced — so no page accumulates on the singleton
 * browser and memory is freed unconditionally. Spec deviation: Puppeteer 25's
 * createPDFStream() resolves to a WHATWG ReadableStream with no .on('end');
 * Readable.fromWeb() bridges it to the Node-stream contract without changing
 * the close-on-end or res.pipe() behavior.
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
  let pageClosed = false;
  const closePage = () => {
    if (pageClosed) {
      return;
    }
    pageClosed = true;
    page.close().catch(() => {});
  };

  try {
    // *************** Ingest the compiled HTML into the blank page
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    // *************** Stream the PDF and free the page when it finishes
    const pdfStream = Readable.fromWeb(await page.createPDFStream({ format: 'A4', printBackground: true }));
    pdfStream.on('end', closePage);
    pdfStream.on('error', closePage);
    return pdfStream;
  } catch (err) {
    // *************** Rendering failed before the stream existed — close the page
    closePage();
    throw err;
  }
}

// *************** EXPORT MODULE ***************
module.exports = { InitializePDFService, GeneratePDFStream };
