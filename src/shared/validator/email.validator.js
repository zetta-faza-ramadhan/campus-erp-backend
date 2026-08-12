// *************** VALIDATE AND SANITIZE EMAIL INPUT ***************
/**
 * Escapes HTML-sensitive characters so user-controlled values are rendered
 * as plain text inside the email body, preventing email HTML injection.
 *
 * @param {*} value - The raw value to escape.
 * @returns {string} The escaped string, or an empty string when null/undefined.
 */
function EscapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
}

/**
 * Strips line breaks and control characters so user-controlled values
 * cannot smuggle extra headers into the email envelope.
 *
 * @param {*} value - The raw value to sanitize.
 * @returns {string} The sanitized single-line string.
 */
function SanitizeEmailSubject(value) {
  return String(value ?? '').replace(/[\r\n\x00-\x1f\x7f]/g, '');
}

// *************** EXPORT MODULE ***************
module.exports = { EscapeHtml, SanitizeEmailSubject };
