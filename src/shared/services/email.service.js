// *************** IMPORT LIBRARY ***************
const nodemailer = require("nodemailer");

// *************** IMPORT MODULE ***************
const config = require("../../core/config");

// *************** GLOBAL VARIABLES ***************
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

// *************** EMAIL SERVICE ***************

/**
 * Sends an email via the configured SMTP transporter.
 *
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject line.
 * @param {string} htmlBody - HTML content of the email.
 * @returns {Promise<Object>} The nodemailer send result.
 */
async function SendEmail(to, subject, htmlBody) {
  return transporter.sendMail({
    from: `"Campus ERP" <${config.smtp.from}>`,
    to,
    subject,
    html: htmlBody,
  });
}

// *************** EXPORT MODULE ***************
module.exports = { SendEmail };
