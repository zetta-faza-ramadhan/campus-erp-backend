// *************** IMPORT CORE ***************
const fs = require('fs/promises');
const path = require('path');

// *************** IMPORT LIBRARY ***************
const express = require('express');
const Handlebars = require('handlebars');

// *************** IMPORT MODULE ***************
const logger = require('../../../core/logger');
const { GeneratePDFStream } = require('../../../shared/services/pdf.service');

// *************** IMPORT VALIDATOR ***************
const { ValidateAndSanitizeReportCardParams } = require('./grading.validator');

// *************** IMPORT HELPER FUNCTION ***************
const { FetchReportCardDataHelper } = require('./report_card.helper');

// *************** GLOBAL VARIABLES ***************
const router = express.Router();
const reportCardTemplatePath = path.join(__dirname, 'templates', 'report_card.hbs');

// *************** REPORT CARD HELPERS ***************

/**
 * Loads the report-card Handlebars template from the filesystem and compiles
 * it against the provided data to produce the final HTML markup.
 *
 * @param {Object} data - The template context (student profile + standings).
 * @returns {Promise<string>} The fully rendered HTML document.
 */
async function CompileReportCardTemplate(data) {
  const source = await fs.readFile(reportCardTemplatePath, 'utf8');
  return Handlebars.compile(source)(data);
}

/**
 * Builds the downloadable filename for a student's report card from the
 * route parameter.
 *
 * @param {string} studentId - The student id from the route params.
 * @returns {string} The attachment filename (e.g. "ReportCard_507f1f77bcf86cd799439011.pdf").
 */
function BuildReportCardFilename(studentId) {
  return `ReportCard_${studentId}.pdf`;
}

/**
 * Logs a mid-stream PDF failure and aborts the response. Invoked when the PDF
 * stream errors after the response headers have already been sent.
 *
 * @param {Object} res - Express response object.
 * @param {Error} err - The streaming error.
 * @returns {void}
 */
function HandlePDFStreamError(res, err) {
  logger.error({ err }, 'Failed to stream report card PDF');
  res.destroy(err);
}

// *************** REPORT CARD ROUTE ***************

/**
 * GET /report-card/:academicYearId/:studentId
 *
 * Transport-only: delegates data fetching and shaping to the business-logic
 * helper, renders the Handlebars report-card template, and streams the
 * resulting PDF directly to the HTTP response (Content-Type: application/pdf).
 * No temporary file is ever written to disk.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
router.get('/report-card/:academicYearId/:studentId', async (req, res, next) => {
  try {
    // *************** Validate and sanitize the route parameters at the transport boundary
    const params = ValidateAndSanitizeReportCardParams({
      academicYearId: req.params.academicYearId,
      studentId: req.params.studentId,
    });

    // *************** Delegate to the business-logic helper with sanitized params
    const data = await FetchReportCardDataHelper({
      academicYearId: params.academicYearId,
      studentId: params.studentId,
    });

    // *************** Compile the template and stream the PDF response
    const compiledHtml = await CompileReportCardTemplate(data);
    const pdfStream = await GeneratePDFStream(compiledHtml);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${BuildReportCardFilename(params.studentId)}"`);
    pdfStream.on('error', HandlePDFStreamError.bind(null, res));
    pdfStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// *************** EXPORT MODULE ***************
module.exports = router;
