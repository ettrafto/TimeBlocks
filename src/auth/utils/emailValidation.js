/**
 * Email validation utility
 * Provides real-time email format validation
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check if an email address is valid
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email format is valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Get email validation error message
 * @param {string} email - The email address to validate
 * @returns {string|null} - Error message if invalid, null if valid
 */
export function getEmailValidationError(email) {
  if (!email) {
    return null; // Empty email is handled by required attribute
  }
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

