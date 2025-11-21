# Error Handling & Edge Cases Implementation Plan

## Overview
Comprehensive plan to improve error handling and edge case management across all authentication flows. This addresses user experience issues, security concerns, and validation consistency.

## Current State Analysis

### Email Verification
- ✅ Backend returns `alreadyVerified` flag in response
- ❌ Frontend doesn't handle `alreadyVerified` case specially
- ❌ No resend verification code functionality
- ❌ Generic error messages for expired/invalid codes
- ❌ No rate limiting feedback

### Password Reset
- ❌ No special handling for expired reset codes
- ❌ No prevention of multiple reset requests
- ❌ No clear messaging about code expiration
- ⚠️ Password validation exists but needs consistency check

### Login Errors
- ⚠️ Detects "not verified" but doesn't show resend link
- ❌ No handling for account locked/disabled
- ⚠️ Basic network error handling exists
- ❌ No specific error messages for different failure types

### Form Validation
- ✅ Password strength indicator exists
- ❌ No real-time email format validation
- ⚠️ Password requirements need alignment check
- ❌ No duplicate submission prevention

## Implementation Plan

### 1. Email Verification Improvements

#### 1.1 Handle "Already Verified" Case
**Files**: `src/auth/pages/VerifyEmailPage.jsx`, `src/auth/pages/SignupPage.jsx`

**Changes**:
- Check `alreadyVerified` flag in `VerifyEmailResponse`
- Show success message: "This email is already verified. You can sign in."
- Auto-redirect to login after 2 seconds
- Update both VerifyEmailPage and SignupPage verification handlers

**Implementation**:
```javascript
const result = await verifyEmail(email, code)
if (result.alreadyVerified) {
  setSuccess(true)
  setMessage('This email is already verified. Redirecting to sign in...')
  // Redirect after delay
} else {
  // Normal success flow
}
```

#### 1.2 Resend Verification Code Functionality
**Files**: `src/auth/pages/VerifyEmailPage.jsx`, `src/auth/pages/SignupPage.jsx`, `src/auth/store.ts`, `src/auth/authClient.ts`

**Changes**:
- Add `resendVerificationCode(email)` function to authClient
- Add `resendVerification` method to auth store
- Add "Resend code" button/link to verification pages
- Show cooldown timer (e.g., "Resend available in 60 seconds")
- Display success message when code is resent

**Backend endpoint**: Reuse signup endpoint or create dedicated resend endpoint

#### 1.3 Expired Code Handling
**Files**: `src/auth/pages/VerifyEmailPage.jsx`, `src/auth/pages/SignupPage.jsx`

**Changes**:
- Detect expired code errors (check error code or message)
- Show clear message: "This verification code has expired. Please request a new one."
- Show "Resend code" button when expired code detected
- Clear the code input field

**Error detection**:
```javascript
if (err?.code === 'expired_code' || err?.message?.toLowerCase().includes('expired')) {
  setError('This verification code has expired. Please request a new one.')
  setShowResend(true)
}
```

#### 1.4 Invalid Code Attempts with Rate Limiting Feedback
**Files**: `src/auth/pages/VerifyEmailPage.jsx`, `src/auth/pages/SignupPage.jsx`

**Changes**:
- Detect rate limiting errors (HTTP 429 or specific error code)
- Show message: "Too many attempts. Please wait X minutes before trying again."
- Disable code input during rate limit period
- Show countdown timer if backend provides retry-after

**Error detection**:
```javascript
if (err?.status === 429 || err?.code === 'rate_limit_exceeded') {
  const retryAfter = err?.details?.retryAfter || 60
  setError(`Too many attempts. Please wait ${retryAfter} seconds before trying again.`)
  setRateLimited(true)
  setRateLimitUntil(Date.now() + retryAfter * 1000)
}
```

### 2. Password Reset Improvements

#### 2.1 Expired Reset Code Handling
**Files**: `src/auth/pages/ResetPasswordPage.jsx`, `src/auth/pages/ForgotPasswordPage.jsx`

**Changes**:
- Detect expired reset code errors
- Show clear message: "This reset code has expired. Please request a new one."
- Add "Request new code" button that navigates back to forgot-password page
- Clear code input when expired

#### 2.2 Multiple Reset Requests Prevention
**Files**: `src/auth/pages/ForgotPasswordPage.jsx`

**Changes**:
- Track when reset was requested (localStorage or state)
- Show warning if user tries to request again within short time window
- Message: "A reset code was recently sent. Please check your email or wait X minutes before requesting another."
- Add cooldown timer before allowing another request

**Implementation**:
```javascript
const RESET_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const lastResetTime = localStorage.getItem(`reset_${email}`)
if (lastResetTime && Date.now() - parseInt(lastResetTime) < RESET_COOLDOWN_MS) {
  const minutesLeft = Math.ceil((RESET_COOLDOWN_MS - (Date.now() - parseInt(lastResetTime))) / 60000)
  setError(`A reset code was recently sent. Please wait ${minutesLeft} minutes before requesting another.`)
  return
}
```

#### 2.3 Password Validation Consistency
**Files**: `src/auth/components/PasswordInput.jsx`, `src/auth/pages/ResetPasswordPage.jsx`, `src/auth/pages/SignupPage.jsx`

**Changes**:
- Verify frontend password requirements match backend
- Check minimum length (likely 8 characters)
- Ensure strength requirements are consistent
- Add validation before form submission
- Show clear error if password doesn't meet requirements

**Backend check needed**: Verify actual password requirements from backend API

### 3. Login Error Improvements

#### 3.1 "Email Not Verified" with Resend Link
**Files**: `src/auth/pages/LoginPage.jsx`

**Changes**:
- Detect "email not verified" errors (check error code or message)
- Show specific error message with resend link
- Add "Resend verification code" button/link
- Navigate to verify-email page with email pre-filled when clicked

**Implementation**:
```javascript
if (errorMsg.toLowerCase().includes('not verified') || 
    errorMsg.toLowerCase().includes('unverified') ||
    err?.code === 'email_not_verified') {
  setShowResendVerification(true)
  setError('Your email address has not been verified. Please verify your email to sign in.')
}
```

#### 3.2 Account Locked/Disabled Messaging
**Files**: `src/auth/pages/LoginPage.jsx`

**Changes**:
- Detect account locked/disabled errors
- Show specific message: "This account has been locked/disabled. Please contact support."
- Check for error codes: `account_locked`, `account_disabled`, `account_suspended`
- Provide contact information or support link

**Error detection**:
```javascript
if (err?.code === 'account_locked' || err?.code === 'account_disabled') {
  setError('This account has been locked. Please contact support for assistance.')
  setShowSupportLink(true)
}
```

#### 3.3 Network Error Handling
**Files**: `src/auth/pages/LoginPage.jsx`, `src/auth/store.ts`

**Changes**:
- Detect network errors (check `code === 'network_error'` or `isAbort`)
- Show user-friendly message: "Unable to connect to server. Please check your internet connection and try again."
- Add retry button for network errors
- Show different message for timeout vs connection failure

**Implementation**:
```javascript
if (err?.code === 'network_error' || err?.isAbort) {
  setError('Unable to connect to server. Please check your internet connection and try again.')
  setShowRetry(true)
}
```

### 4. Form Validation Improvements

#### 4.1 Real-time Email Format Validation
**Files**: `src/auth/pages/LoginPage.jsx`, `src/auth/pages/SignupPage.jsx`, `src/auth/pages/ForgotPasswordPage.jsx`, `src/auth/pages/ResetPasswordPage.jsx`

**Changes**:
- Create `src/auth/utils/emailValidation.js` utility
- Add real-time validation on email input blur/change
- Show inline error message for invalid email format
- Use standard email regex pattern
- Disable submit button if email is invalid

**Email regex**:
```javascript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(email) {
  return EMAIL_REGEX.test(email)
}
```

#### 4.2 Password Strength Requirements Alignment
**Files**: `src/auth/components/PasswordInput.jsx`

**Changes**:
- Verify password requirements match backend exactly
- Update strength calculation if needed
- Ensure requirements checklist matches backend validation
- Add backend validation check on submit (show error if backend rejects)

**Check backend requirements**:
- Minimum length
- Required character types (uppercase, lowercase, number, special)
- Maximum length (if any)

#### 4.3 Prevent Duplicate Submissions
**Files**: All auth page components

**Changes**:
- Add `isSubmitting` state check at start of submit handlers
- Disable submit button when `isSubmitting` is true
- Prevent form submission if already submitting
- Add debounce to prevent rapid clicks

**Implementation**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault()
  if (isSubmitting) return // Prevent duplicate submissions
  setIsSubmitting(true)
  // ... rest of handler
}
```

## Implementation Order

1. **Phase 1: Critical Error Handling**
   - Duplicate submission prevention (all pages)
   - Network error handling (login)
   - Expired code detection (verify, reset)

2. **Phase 2: User Experience**
   - Already verified handling
   - Email not verified with resend link
   - Real-time email validation

3. **Phase 3: Advanced Features**
   - Resend verification code functionality
   - Rate limiting feedback
   - Multiple reset request prevention
   - Account locked/disabled messaging

4. **Phase 4: Validation Consistency**
   - Password validation alignment
   - Backend requirement verification

## Testing Checklist

### Email Verification
- [ ] Already verified case shows correct message and redirects
- [ ] Resend code button works and shows cooldown
- [ ] Expired code shows clear message with resend option
- [ ] Rate limiting shows countdown and disables input
- [ ] Invalid code shows appropriate error

### Password Reset
- [ ] Expired reset code shows message with request new code option
- [ ] Multiple reset requests show cooldown warning
- [ ] Password validation matches backend requirements
- [ ] Password mismatch shows clear error

### Login
- [ ] Email not verified shows resend link
- [ ] Account locked shows support message
- [ ] Network errors show retry option
- [ ] Invalid credentials show clear message

### Form Validation
- [ ] Email format validated in real-time
- [ ] Invalid email disables submit button
- [ ] Password strength matches backend
- [ ] Duplicate submissions prevented
- [ ] All forms disable during submission

## Files to Create/Modify

### New Files
- `src/auth/utils/emailValidation.js` - Email validation utility
- `src/auth/utils/submissionGuard.js` - Duplicate submission prevention hook

### Modified Files
- `src/auth/pages/LoginPage.jsx` - Enhanced error handling
- `src/auth/pages/SignupPage.jsx` - Already verified, resend, expired codes
- `src/auth/pages/VerifyEmailPage.jsx` - Already verified, resend, expired codes, rate limiting
- `src/auth/pages/ForgotPasswordPage.jsx` - Multiple request prevention
- `src/auth/pages/ResetPasswordPage.jsx` - Expired code handling
- `src/auth/components/PasswordInput.jsx` - Validation alignment
- `src/auth/store.ts` - Add resendVerification method
- `src/auth/authClient.ts` - Add resendVerificationCode function

## Notes

- Backend error codes may need to be verified/standardized
- Some features (like rate limiting countdown) depend on backend providing retry-after information
- Password requirements should be verified against actual backend validation
- Consider adding error code constants for consistency
- All error messages should be user-friendly and actionable

