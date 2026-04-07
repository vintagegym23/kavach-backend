function normalizeVehicleNumber(input) {
  if (!input) return null;

  const cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  if (cleaned.length < 6 || cleaned.length > 12) return null;

  return cleaned;
}

function validatePhone(phone) {
  if (!phone) return false;
  return /^\d{10}$/.test(phone);
}

function sanitizeText(text, maxLength = 255) {
  if (!text) return null;

  const trimmed = String(text).trim();

  if (trimmed.length === 0) return null;

  return trimmed.substring(0, maxLength);
}

function forceBoolean(val) {
  return val === true || val === 'true';
}

module.exports = {
  normalizeVehicleNumber,
  validatePhone,
  sanitizeText,
  forceBoolean
};
