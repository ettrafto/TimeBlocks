import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store'
import AuthLayout from '../components/AuthLayout'
import CodeInput from '../components/CodeInput'
import PasswordInput from '../components/PasswordInput'
import FormError from '../components/FormError'
import { fetchPasswordResetCode } from '../api'
import { isValidEmail, getEmailValidationError } from '../utils/emailValidation'
import { isTBError } from '../../lib/api/normalizeError'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { resetPassword, status } = useAuthStore()
  
  // Get email and code from URL params, location state, or empty
  const emailParam = searchParams.get('email')
  const codeParam = searchParams.get('code')
  const emailFromState = location.state?.email
  const codeFromState = location.state?.code
  
  const [email, setEmail] = useState(emailParam || emailFromState || '')
  const [code, setCode] = useState(codeParam || codeFromState || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [showRequestNewCode, setShowRequestNewCode] = useState(false)
  
  // Dev mode: Auto-fetch reset code
  const [devCode, setDevCode] = useState(null)
  const [devCodeError, setDevCodeError] = useState(null)
  const isDev = import.meta.env.DEV

  // Auto-fill code from URL params, state, or dev fetch
  useEffect(() => {
    if (codeParam) {
      setCode(codeParam)
    } else if (codeFromState) {
      setCode(codeFromState)
    } else if (isDev && email && !code) {
      fetchDevCode()
    }
  }, [codeParam, codeFromState, isDev, email, code])

  // Auto-fill code when fetched
  useEffect(() => {
    if (devCode && !code) {
      setCode(devCode)
    }
  }, [devCode])

  // Check password match
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordMismatch(true)
    } else {
      setPasswordMismatch(false)
    }
  }, [newPassword, confirmPassword])

  // Real-time email validation
  useEffect(() => {
    if (email && !isSubmitting) {
      const error = getEmailValidationError(email)
      setEmailError(error)
    } else {
      setEmailError(null)
    }
  }, [email, isSubmitting])

  const fetchDevCode = async () => {
    if (!email) {
      setDevCodeError('Please enter an email address first')
      return
    }
    setDevCodeError(null)
    try {
      const response = await fetchPasswordResetCode(email)
      if (response.code) {
        setDevCode(response.code)
      } else {
        setDevCodeError(response.message || 'No password reset code found')
      }
    } catch (err) {
      setDevCodeError(err?.message || 'Failed to fetch password reset code')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return
    }
    
    setError(null)
    setShowRequestNewCode(false)
    
    // Validation
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await resetPassword(email, code, newPassword)
      setSuccess(true)
      
      // Redirect to login after brief delay
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password reset successfully! Please sign in with your new password.' }
        })
      }, 2000)
    } catch (err) {
      const tbError = isTBError(err) ? err : null
      const errorMsg = err?.message || 'Password reset failed. Please check your code and try again.'
      
      // Check for expired code
      if (tbError?.code === 'expired_code' || errorMsg.toLowerCase().includes('expired')) {
        setError('This reset code has expired. Please request a new one.')
        setShowRequestNewCode(true)
        setCode('') // Clear the code
      }
      else {
        setError(errorMsg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestNewCode = () => {
    navigate('/forgot-password', {
      state: { email }
    })
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Reset your password</h2>
          <p className="text-sm text-gray-600">
            Enter the reset code and choose a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-email">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                if (email) {
                  const error = getEmailValidationError(email)
                  setEmailError(error)
                }
              }}
              className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                emailError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="you@example.com"
              disabled={isSubmitting || success}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reset code
            </label>
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={isSubmitting || success}
              error={!!error}
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          {/* Dev mode: Fetch code button */}
          {isDev && (
            <div className="text-xs">
              <button
                type="button"
                onClick={fetchDevCode}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Fetch reset code (dev)
              </button>
              {devCode && (
                <div className="mt-1 text-green-600">Code fetched: {devCode}</div>
              )}
              {devCodeError && (
                <div className="mt-1 text-red-600">{devCodeError}</div>
              )}
            </div>
          )}

          <PasswordInput
            id="reset-new-password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            required
            showStrength={true}
            showRequirements={true}
            disabled={isSubmitting || success}
            error={passwordMismatch && confirmPassword ? true : false}
            errorMessage={passwordMismatch && confirmPassword ? 'Passwords do not match' : undefined}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-confirm-password">
              Confirm password
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                passwordMismatch && confirmPassword
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              } ${isSubmitting || success ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Confirm your password"
              disabled={isSubmitting || success}
            />
            {passwordMismatch && confirmPassword && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {error && !success && <FormError error={error} />}
          
          {showRequestNewCode && (
            <div className="text-sm">
              <button
                type="button"
                onClick={handleRequestNewCode}
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Request new reset code
              </button>
            </div>
          )}
          
          {success && (
            <FormError 
              error="Password reset successfully! Redirecting to sign in…" 
              type="info"
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting || success || passwordMismatch || !newPassword || !confirmPassword || !!emailError}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
          >
            {isSubmitting ? 'Resetting password…' : success ? 'Password reset!' : 'Reset Password'}
          </button>

          <div className="text-sm text-center text-gray-600">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}

