import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import FormError from '../components/FormError'
import CodeInput from '../components/CodeInput'
import { fetchVerificationCode } from '../api'
import { isValidReturnUrl } from '../constants/routes'
import { isValidEmail, getEmailValidationError } from '../utils/emailValidation'
import { isTBError } from '../../lib/api/normalizeError'

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signup, verifyEmail, status, error, pendingEmail } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerification, setShowVerification] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [showResend, setShowResend] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [rateLimitUntil, setRateLimitUntil] = useState(null)
  
  // Dev mode: Auto-fetch verification code
  const [devCode, setDevCode] = useState(null)
  const [devCodeError, setDevCodeError] = useState(null)
  const isDev = import.meta.env.DEV

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const returnTo = location.state?.returnTo
      const destination = isValidReturnUrl(returnTo) ? returnTo : '/'
      navigate(destination, { replace: true })
    }
  }, [status, navigate, location])

  // Define fetchDevCode with useCallback to avoid dependency issues
  const fetchDevCode = useCallback(async (emailToFetch) => {
    if (!emailToFetch || !emailToFetch.trim()) {
      setDevCodeError('Email is required to fetch verification code')
      return
    }
    setDevCodeError(null)
    try {
      // Normalize email to lowercase (same as store does)
      const normalizedEmail = emailToFetch.toLowerCase().trim()
      const response = await fetchVerificationCode(normalizedEmail)
      if (response.code) {
        setDevCode(response.code)
      } else {
        setDevCodeError(response.message || 'No verification code found')
      }
    } catch (err) {
      setDevCodeError(err?.message || 'Failed to fetch verification code')
    }
  }, [])

  // Show verification form after successful signup
  useEffect(() => {
    if (pendingEmail) {
      setShowVerification(true)
      // Auto-fetch code in dev mode
      if (isDev) {
        fetchDevCode(pendingEmail)
      }
    }
  }, [pendingEmail, isDev, fetchDevCode])

  // Auto-fill verification code when fetched
  useEffect(() => {
    if (devCode) {
      setVerificationCode(devCode)
    }
  }, [devCode])

  // Real-time email validation
  useEffect(() => {
    if (email && !isSubmitting && !showVerification) {
      const error = getEmailValidationError(email)
      setEmailError(error)
    } else {
      setEmailError(null)
    }
  }, [email, isSubmitting, showVerification])

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitUntil) {
      const interval = setInterval(() => {
        const now = Date.now()
        if (now >= rateLimitUntil) {
          setRateLimited(false)
          setRateLimitUntil(null)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [rateLimitUntil])

  const handleSignup = async (e) => {
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
    
    setLocalError(null)
    setEmailError(null)
    setIsSubmitting(true)
    
    try {
      await signup(email, password, name || null)
      // Store email for verification (will be normalized in store)
      setShowVerification(true)
      // Note: Auto-fetch code is handled by useEffect watching pendingEmail
    } catch (err) {
      setLocalError(err?.message || 'Signup failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    
    // Prevent duplicate submissions
    if (isVerifying) {
      return
    }
    
    if (!verificationCode || verificationCode.length !== 6) {
      setLocalError('Please enter a valid 6-digit code')
      return
    }
    
    // Use pendingEmail from store (normalized) or local email state
    const emailToVerify = pendingEmail || email
    if (!emailToVerify) {
      setLocalError('Email address is required for verification')
      return
    }
    
    setLocalError(null)
    setShowResend(false)
    setIsVerifying(true)
    
    try {
      const result = await verifyEmail(emailToVerify, verificationCode)
      
      // Handle already verified case
      if (result.alreadyVerified) {
        setVerificationSuccess(true)
        setLocalError('This email is already verified. Redirecting to sign in...')
        setTimeout(() => {
          navigate('/login', { 
            replace: true, 
            state: { message: 'This email is already verified. Please sign in.' }
          })
        }, 2000)
        return
      }
      
      setVerificationSuccess(true)
      // Redirect to login after a brief delay
      setTimeout(() => {
        navigate('/login', { 
          replace: true, 
          state: { message: 'Email verified successfully. Please sign in.' }
        })
      }, 2000)
    } catch (err) {
      const tbError = isTBError(err) ? err : null
      const errorMsg = err?.message || 'Verification failed'
      
      // Check for expired code
      if (tbError?.code === 'expired_code' || errorMsg.toLowerCase().includes('expired')) {
        setLocalError('This verification code has expired. Please request a new one.')
        setShowResend(true)
        setVerificationCode('') // Clear the code
      }
      // Check for rate limiting
      else if (tbError?.status === 429 || tbError?.code === 'rate_limit_exceeded') {
        const retryAfter = tbError?.details?.retryAfter || 60
        setLocalError(`Too many attempts. Please wait ${retryAfter} seconds before trying again.`)
        setRateLimited(true)
        setRateLimitUntil(Date.now() + retryAfter * 1000)
      }
      else {
        setLocalError(errorMsg)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const displayError = error || localError

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
          <p className="text-sm text-gray-600">
            Sign up to start organizing your time with TimeBlocks
          </p>
        </div>

        {!showVerification ? (
          // Signup Form
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-name">
                Name <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Jane Doe"
                disabled={isSubmitting}
              />
            </div>

            <PasswordInput
              id="signup-password"
              label="Password"
              value={password}
              onChange={setPassword}
              required
              showStrength={true}
              showRequirements={true}
              disabled={isSubmitting}
            />

            {displayError && <FormError error={displayError} />}

            <button
              type="submit"
              disabled={isSubmitting || !!emailError}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>

            <div className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </div>
          </form>
        ) : (
          // Verification Form
          <div className="space-y-4">
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
              Verification email sent to <strong>{pendingEmail || email}</strong>
            </div>

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter verification code
                </label>
                <CodeInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying}
                  error={!!displayError}
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
                    onClick={() => fetchDevCode(pendingEmail || email)}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Fetch verification code (dev)
                  </button>
                  {devCode && (
                    <div className="mt-1 text-green-600">Code fetched: {devCode}</div>
                  )}
                  {devCodeError && (
                    <div className="mt-1 text-red-600">{devCodeError}</div>
                  )}
                </div>
              )}

              {displayError && <FormError error={displayError} />}
              
              {showResend && (
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={async () => {
                      // Resend by calling signup again (which sends a new verification code)
                      try {
                        setLocalError(null)
                        await signup(email, password, name || null)
                        setLocalError('Verification code resent. Please check your email.')
                      } catch (err) {
                        setLocalError(err?.message || 'Failed to resend verification code')
                      }
                    }}
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    Resend verification code
                  </button>
                </div>
              )}
              
              {rateLimited && rateLimitUntil && (
                <div className="text-sm text-gray-600">
                  Resend available in {Math.ceil((rateLimitUntil - Date.now()) / 1000)} seconds
                </div>
              )}
              
              {verificationSuccess && (
                <FormError 
                  error="Email verified successfully! Redirecting to sign in…" 
                  type="info"
                />
              )}

              <button
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6 || rateLimited}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
              >
                {isVerifying ? 'Verifying…' : 'Verify Email'}
              </button>

              <div className="text-sm text-center text-gray-600">
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Back to sign in
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

