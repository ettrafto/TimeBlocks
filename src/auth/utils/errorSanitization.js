/**
 * Error message sanitization utility
 * Prevents XSS attacks and information leakage in error messages
 */

/**
 * Sanitize error message to prevent XSS
 * Removes HTML tags and escapes special characters
 * @param {string} message - The error message to sanitize
 * @returns {string} - Sanitized error message
 */
export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An error occurred'
  }

  // Remove HTML tags
  let sanitized = message.replace(/<[^>]*>/g, '')
  
  // Escape special characters that could be used in XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  return sanitized
}

/**
 * Get a generic error message for security-sensitive errors
 * Prevents information leakage about authentication state
 * @param {string} originalMessage - Original error message
 * @param {string} errorCode - Error code from backend
 * @returns {string} - Generic error message
 */
export function getGenericErrorMessage(originalMessage, errorCode) {
  // Security-sensitive error codes that should use generic messages
  const securitySensitiveCodes = [
    'bad_credentials',
    'email_not_verified',
    'account_locked',
    'account_disabled',
    'account_suspended',
    'invalid_token',
    'expired_token',
    'unauthorized',
    'forbidden'
  ]

  if (errorCode && securitySensitiveCodes.includes(errorCode)) {
    // Return generic messages for security-sensitive errors
    switch (errorCode) {
      case 'bad_credentials':
        return 'Invalid email or password'
      case 'email_not_verified':
        return 'Please verify your email address to continue'
      case 'account_locked':
      case 'account_disabled':
      case 'account_suspended':
        return 'This account is currently unavailable. Please contact support.'
      case 'invalid_token':
      case 'expired_token':
        return 'Your session has expired. Please sign in again.'
      case 'unauthorized':
        return 'You are not authorized to perform this action'
      case 'forbidden':
        return 'Access denied'
      default:
        return 'An authentication error occurred. Please try again.'
    }
  }

  // For non-security-sensitive errors, sanitize but return original message
  return sanitizeErrorMessage(originalMessage)
}

/**
 * Check if error message contains sensitive information
 * @param {string} message - Error message to check
 * @returns {boolean} - True if message might contain sensitive info
 */
export function containsSensitiveInfo(message) {
  if (!message || typeof message !== 'string') {
    return false
  }

  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /credential/i,
    /sql/i,
    /database/i,
    /stack.*trace/i,
    /exception/i,
    /error.*at.*line/i
  ]

  return sensitivePatterns.some(pattern => pattern.test(message))
}

