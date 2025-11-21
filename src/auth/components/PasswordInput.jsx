import React, { useState, useMemo } from 'react'

/**
 * PasswordInput - Password input with show/hide toggle and strength indicator
 * Features:
 * - Show/hide password toggle
 * - Password strength indicator
 * - Validation feedback
 * - Requirements checklist
 * - Accessible
 */
export default function PasswordInput({
  value,
  onChange,
  label = 'Password',
  id,
  name,
  required = false,
  showStrength = true,
  showRequirements = true,
  disabled = false,
  error = false,
  errorMessage,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)

  // Calculate password strength
  const strength = useMemo(() => {
    if (!value) return { level: 0, label: '', color: '' }

    let score = 0
    if (value.length >= 8) score++
    if (value.length >= 12) score++
    if (/[a-z]/.test(value)) score++
    if (/[A-Z]/.test(value)) score++
    if (/\d/.test(value)) score++
    if (/[^a-zA-Z0-9]/.test(value)) score++

    if (score <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' }
    if (score <= 4) return { level: 2, label: 'Fair', color: 'bg-yellow-500' }
    if (score <= 5) return { level: 3, label: 'Good', color: 'bg-blue-500' }
    return { level: 4, label: 'Strong', color: 'bg-green-500' }
  }, [value])

  // Check requirements
  const requirements = useMemo(() => {
    if (!value) return {}
    return {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^a-zA-Z0-9]/.test(value),
    }
  }, [value])

  return (
    <div className={className}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="new-password"
          className={`
            w-full rounded-md border px-3 py-2 pr-10
            shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            ${error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-invalid={error}
          aria-describedby={
            error && errorMessage 
              ? `${id}-error` 
              : showRequirements && value 
                ? `${id}-requirements` 
                : undefined
          }
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {/* Error message is already sanitized by parent component */}
          {errorMessage}
        </p>
      )}

      {/* Password Strength Indicator */}
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${strength.color}`}
                style={{ width: `${(strength.level / 4) * 100}%` }}
                role="progressbar"
                aria-valuenow={strength.level}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label={`Password strength: ${strength.label}`}
              />
            </div>
            <span className="text-xs text-gray-600">{strength.label}</span>
          </div>
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && value && (
        <ul 
          id={`${id}-requirements`}
          className="mt-2 space-y-1 text-xs text-gray-600"
          aria-label="Password requirements"
        >
          <li className={requirements.length ? 'text-green-600' : ''}>
            {requirements.length ? '✓' : '○'} At least 8 characters
          </li>
          <li className={requirements.uppercase ? 'text-green-600' : ''}>
            {requirements.uppercase ? '✓' : '○'} One uppercase letter
          </li>
          <li className={requirements.lowercase ? 'text-green-600' : ''}>
            {requirements.lowercase ? '✓' : '○'} One lowercase letter
          </li>
          <li className={requirements.number ? 'text-green-600' : ''}>
            {requirements.number ? '✓' : '○'} One number
          </li>
          <li className={requirements.special ? 'text-green-600' : ''}>
            {requirements.special ? '✓' : '○'} One special character
          </li>
        </ul>
      )}
    </div>
  )
}

