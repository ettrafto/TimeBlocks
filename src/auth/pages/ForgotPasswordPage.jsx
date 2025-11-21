import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store'
import AuthLayout from '../components/AuthLayout'
import FormError from '../components/FormError'
import CodeInput from '../components/CodeInput'
import { fetchPasswordResetCode } from '../api'
import { isValidEmail, getEmailValidationError } from '../utils/emailValidation'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { requestPasswordReset, status } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  
  // Dev mode: Auto-fetch reset code
  const [devCode, setDevCode] = useState(null)
  const [devCodeError, setDevCodeError] = useState(null)
  const isDev = import.meta.env.DEV

  const RESET_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

  // Auto-fill code when fetched
  useEffect(() => {
    if (devCode) {
      setCode(devCode)
    }
  }, [devCode])

  // Real-time email validation
  useEffect(() => {
    if (email && !isSubmitting && !showCodeForm) {
      const error = getEmailValidationError(email)
      setEmailError(error)
    } else {
      setEmailError(null)
    }
  }, [email, isSubmitting, showCodeForm])

  // Cooldown countdown
  useEffect(() => {
    if (cooldownUntil) {
      const interval = setInterval(() => {
        const now = Date.now()
        if (now >= cooldownUntil) {
          setCooldownUntil(null)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [cooldownUntil])

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

  const handleRequestReset = async (e) => {
    e.preventDefault()
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    // Check cooldown for multiple requests
    const normalizedEmail = email.toLowerCase().trim()
    const lastResetTime = localStorage.getItem(`reset_${normalizedEmail}`)
    if (lastResetTime && Date.now() - parseInt(lastResetTime) < RESET_COOLDOWN_MS) {
      const minutesLeft = Math.ceil((RESET_COOLDOWN_MS - (Date.now() - parseInt(lastResetTime))) / 60000)
      setError(`A reset code was recently sent. Please check your email or wait ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} before requesting another.`)
      setCooldownUntil(parseInt(lastResetTime) + RESET_COOLDOWN_MS)
      return
    }
    
    setError(null)
    setEmailError(null)
    setIsSubmitting(true)
    
    try {
      await requestPasswordReset(email)
      setSuccess(true)
      setShowCodeForm(true)
      
      // Store reset time in localStorage
      localStorage.setItem(`reset_${normalizedEmail}`, Date.now().toString())
      setCooldownUntil(Date.now() + RESET_COOLDOWN_MS)
      
      // Auto-fetch code in dev mode
      if (isDev) {
        await fetchDevCode()
      }
    } catch (err) {
      setError(err?.message || 'Failed to send reset code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinueToReset = () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    
    // Navigate to reset password page with email and code
    navigate('/reset-password', {
      state: { email, code }
    })
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Reset your password</h2>
          <p className="text-sm text-gray-600">
            Enter your email address and we'll send you a reset code
          </p>
        </div>

        {!showCodeForm ? (
          // Request Reset Form
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
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
                disabled={isSubmitting}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>

            {error && <FormError error={error} />}
            
            {cooldownUntil && (
              <div className="text-sm text-gray-600">
                Resend available in {Math.ceil((cooldownUntil - Date.now()) / 60000)} minute{Math.ceil((cooldownUntil - Date.now()) / 60000) !== 1 ? 's' : ''}
              </div>
            )}
            
            {success && (
              <FormError 
                error={`Password reset code sent to ${email}`} 
                type="info"
              />
            )}

            <button
              type="submit"
              disabled={isSubmitting || !!emailError || (cooldownUntil && Date.now() < cooldownUntil)}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Code'}
            </button>

            <div className="text-sm text-center text-gray-600">
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to sign in
              </Link>
            </div>
          </form>
        ) : (
          // Code Input Form
          <div className="space-y-4">
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
              Password reset code sent to <strong>{email}</strong>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter reset code
              </label>
              <CodeInput
                value={code}
                onChange={setCode}
                disabled={isSubmitting}
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

            {error && <FormError error={error} />}

            <button
              type="button"
              onClick={handleContinueToReset}
              disabled={code.length !== 6}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
            >
              Continue to Reset Password
            </button>

            <div className="text-sm text-center text-gray-600">
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

