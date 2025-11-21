import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import AuthLayout from '../components/AuthLayout'
import FormError from '../components/FormError'
import { isValidReturnUrl } from '../constants/routes'
import { isValidEmail, getEmailValidationError } from '../utils/emailValidation'
import { isTBError } from '../../lib/api/normalizeError'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, status, error, clearError } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  
  // Get message from location state (e.g., from verification success)
  const message = location.state?.message

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const returnTo = location.state?.returnTo
      // Validate return URL - must be valid and not an auth route
      const destination = isValidReturnUrl(returnTo) ? returnTo : '/'
      navigate(destination, { replace: true })
    }
  }, [status, navigate, location])

  // Clear error when component unmounts or email/password changes
  useEffect(() => {
    return () => clearError()
  }, [clearError])

  // Real-time email validation
  useEffect(() => {
    if (email && !isSubmitting) {
      const error = getEmailValidationError(email)
      setEmailError(error)
    } else {
      setEmailError(null)
    }
  }, [email, isSubmitting])

  const handleSubmit = async (e) => {
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
    
    clearError()
    setShowResendVerification(false)
    setShowRetry(false)
    setIsSubmitting(true)
    
    try {
      await login(email, password)
      // Navigation handled by useEffect above
    } catch (err) {
      // Error is set in store by login()
      const errorMsg = err?.message || 'Login failed'
      const tbError = isTBError(err) ? err : null
      
      // Check for email not verified
      if (errorMsg.toLowerCase().includes('not verified') || 
          errorMsg.toLowerCase().includes('unverified') ||
          tbError?.code === 'email_not_verified') {
        setShowResendVerification(true)
      }
      
      // Check for account locked/disabled
      if (tbError?.code === 'account_locked' || 
          tbError?.code === 'account_disabled' ||
          tbError?.code === 'account_suspended') {
        // Error message already set in store
      }
      
      // Check for network errors
      if (tbError?.code === 'network_error' || tbError?.isAbort) {
        setShowRetry(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = () => {
    navigate('/verify-email', {
      state: { email }
    })
  }

  const handleRetry = (e) => {
    e.preventDefault()
    handleSubmit(e)
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Sign in to TimeBlocks</h2>
          <p className="text-sm text-gray-600">
            Access your calendar and task workspace
          </p>
        </div>

        {message && (
          <FormError error={message} type="info" />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
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
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          {error && <FormError error={error} />}
          
          {showResendVerification && (
            <div className="text-sm">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Resend verification code
              </button>
            </div>
          )}
          
          {showRetry && (
            <div className="text-sm">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isSubmitting}
                className="text-blue-600 hover:text-blue-500 underline disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !!emailError}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 font-medium"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-sm text-center space-y-2">
            <div>
              <Link 
                to="/forgot-password" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}

