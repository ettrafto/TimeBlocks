import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store'
import AuthLayout from '../components/AuthLayout'
import CodeInput from '../components/CodeInput'
import FormError from '../components/FormError'
import { fetchVerificationCode } from '../api'
import { isValidReturnUrl } from '../constants/routes'
import { isValidEmail, getEmailValidationError } from '../utils/emailValidation'
import { isTBError } from '../../lib/api/normalizeError'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { verifyEmail, status, pendingEmail } = useAuthStore()
  
  // Get email from URL params, location state, or pendingEmail
  const emailParam = searchParams.get('email')
  const emailFromState = location.state?.email
  const defaultEmail = emailParam || emailFromState || pendingEmail || ''
  
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
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

  // Auto-fetch code in dev mode when email is available
  useEffect(() => {
    if (isDev && email && !code) {
      fetchDevCode()
    }
  }, [isDev, email])

  // Auto-fill code when fetched
  useEffect(() => {
    if (devCode && !code) {
      setCode(devCode)
    }
  }, [devCode])

  // Auto-submit when 6 digits are entered - using a ref to avoid dependency issues
  const handleVerifyRef = useRef(null)
  handleVerifyRef.current = handleVerify
  
  useEffect(() => {
    if (code.length === 6 && !isSubmitting && !success && !rateLimited) {
      handleVerifyRef.current()
    }
  }, [code, isSubmitting, success, rateLimited])

  // Real-time email validation
  useEffect(() => {
    if (email && !isSubmitting) {
      const error = getEmailValidationError(email)
      setEmailError(error)
    } else {
      setEmailError(null)
    }
  }, [email, isSubmitting])

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

  const fetchDevCode = async () => {
    if (!email) {
      setDevCodeError('Please enter an email address first')
      return
    }
    setDevCodeError(null)
    try {
      const response = await fetchVerificationCode(email)
      if (response.code) {
        setDevCode(response.code)
      } else {
        setDevCodeError(response.message || 'No verification code found')
      }
    } catch (err) {
      setDevCodeError(err?.message || 'Failed to fetch verification code')
    }
  }

  const handleVerify = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return
    }
    
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setError(null)
    setEmailError(null)
    setShowResend(false)
    setIsSubmitting(true)
    
    try {
      const result = await verifyEmail(email, code)
      
      // Handle already verified case
      if (result.alreadyVerified) {
        setSuccess(true)
        setError('This email is already verified. Redirecting to sign in...')
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: 'This email is already verified. Please sign in.' }
          })
        }, 2000)
        return
      }
      
      setSuccess(true)
      
      // Redirect to login after brief delay
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Email verified successfully! Please sign in.' }
        })
      }, 2000)
    } catch (err) {
      const tbError = isTBError(err) ? err : null
      const errorMsg = err?.message || 'Verification failed. Please check your code and try again.'
      
      // Check for expired code
      if (tbError?.code === 'expired_code' || errorMsg.toLowerCase().includes('expired')) {
        setError('This verification code has expired. Please request a new one.')
        setShowResend(true)
        setCode('') // Clear the code
      }
      // Check for rate limiting
      else if (tbError?.status === 429 || tbError?.code === 'rate_limit_exceeded') {
        const retryAfter = tbError?.details?.retryAfter || 60
        setError(`Too many attempts. Please wait ${retryAfter} seconds before trying again.`)
        setRateLimited(true)
        setRateLimitUntil(Date.now() + retryAfter * 1000)
      }
      else {
        setError(errorMsg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleVerify()
  }

  const authError = useAuthStore((state) => state.error)
  const displayError = error || authError

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Verify your email</h2>
          <p className="text-sm text-gray-600">
            Enter the 6-digit verification code sent to your inbox
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="verify-email">
              Email
            </label>
            <input
              id="verify-email"
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
              Verification code
            </label>
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={isSubmitting || success || rateLimited}
              error={!!displayError}
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the 6-digit code from your email
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

          {displayError && !success && <FormError error={displayError} />}
          
          {showResend && (
            <div className="text-sm">
              <button
                type="button"
                onClick={() => {
                  // Navigate to signup to resend verification code
                  navigate('/signup', {
                    state: { email, resendVerification: true }
                  })
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
          
          {success && (
            <FormError 
              error="Email verified successfully! Redirecting to sign in…" 
              type="info"
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting || success || code.length !== 6 || rateLimited || !!emailError}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
          >
            {isSubmitting ? 'Verifying…' : success ? 'Verified!' : 'Verify Email'}
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

