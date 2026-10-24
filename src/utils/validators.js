// Small hand-written validators shared by the services.
const { ValidationError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isBlank(v) { return v === undefined || v === null || String(v).trim() === ''; }

// Returns the normalised ISBN (hyphens/spaces removed, last char of ISBN-10 may be X) or null.
// Checks FORMAT only (10 or 13 characters); the check digit is not verified.
function normaliseIsbn(raw) {
  const s = String(raw ?? '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(s) || /^\d{9}[\dX]$/.test(s)) return s;
  return null;
}

function normalisePhone(raw) {
  const s = String(raw ?? '').replace(/[\s-]/g, '');
  return /^\d{10}$/.test(s) ? s : null;
}

function isValidEmail(s) { return EMAIL_RE.test(String(s ?? '').trim()); }

// Parses an id from a URL/body value. Returns a positive integer or null.
function parseId(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (typeof v === 'string' && /^[1-9]\d*$/.test(v)) return Number(v);
  return null;
}

function throwIfErrors(errors) {
  if (errors.length) throw new ValidationError('Validation failed. Please correct the highlighted fields.', errors);
}

module.exports = { isBlank, normaliseIsbn, normalisePhone, isValidEmail, parseId, throwIfErrors };
