import React from 'react'
import { sanitizeErrorMessage } from '../utils/errorSanitization'

/**
 * FormError - Consistent error message display component
 * Features:
 * - Consistent error styling
 * - Different styles for different error types
 * - Auto-dismiss option
 * - Accessible error announcements
 * - XSS protection via message sanitization
 */
export default function FormError({ 
  error, 
  type = 'error', // 'error' | 'warning' | 'info'
  dismissible = false,
  onDismiss,
  className = '',
  ...props 
}) {
  if (!error) return null
  
  // Sanitize error message to prevent XSS
  const sanitizedError = sanitizeErrorMessage(error)

  const baseStyles = 'text-sm rounded-md p-3 flex items-start gap-2'
  const typeStyles = {
    error: 'bg-red-50 border border-red-200 text-red-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border border-blue-200 text-blue-800',
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`${baseStyles} ${typeStyles[type]} ${className}`}
      {...props}
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        {type === 'error' && (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        )}
        {type === 'warning' && (
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        )}
        {type === 'info' && (
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <div className="flex-1">
        <p>{sanitizedError}</p>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100 focus:outline-none"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

