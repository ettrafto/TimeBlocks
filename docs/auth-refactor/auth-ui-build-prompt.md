# Auth UI Build Prompt

## Context Summary

This prompt is for building a production-ready authentication UI for the TimeBlocks application. The backend and auth infrastructure have been fully implemented and tested using the `/api-testing` diagnostics page. This document summarizes the complete auth system and provides specifications for building the user-facing UI.

## Auth System Overview

### Backend Endpoints (All tested and working)

1. **Signup** - `POST /api/auth/signup`
   - Creates new user account
   - Sends verification email
   - Returns: `{ status: "verification_required" }`
   - Dev-only: Code available via `GET /api/dev/verification-code/{email}`

2. **Verify Email** - `POST /api/auth/verify-email`
   - Verifies email with 6-digit code
   - Body: `{ email: string, code: string }`
   - Returns: `{ verified: boolean, alreadyVerified: boolean, verifiedAt: string }`

3. **Login** - `POST /api/auth/login`
   - Authenticates user
   - Sets `tb_access` and `tb_refresh` cookies (HttpOnly, Secure in production)
   - Returns: `{ user: AuthUser }`

4. **Refresh Tokens** - `POST /api/auth/refresh`
   - Refreshes access token using refresh token cookie
   - Returns: `{ user: AuthUser }`

5. **Logout** - `POST /api/dev/auth/logout`
   - Revokes refresh token
   - Clears cookies
   - Always returns 200 (safe to call multiple times)

6. **Fetch Current User** - `GET /api/auth/me`
   - Returns current authenticated user
   - Returns: `{ user: AuthUser }` or 401 if not authenticated

7. **Request Password Reset** - `POST /api/auth/request-password-reset`
   - Sends password reset code to email
   - Body: `{ email: string }`
   - Always returns 200 (to prevent enumeration)

8. **Reset Password** - `POST /api/auth/reset-password`
   - Resets password with code
   - Body: `{ email: string, code: string, newPassword: string }`
   - Revokes all refresh tokens

9. **CSRF Token** - `GET /api/auth/csrf`
   - Fetches CSRF token cookie (`XSRF-TOKEN`)
   - Required for state-changing operations

### Frontend Infrastructure (Already Implemented)

1. **Auth Store** (`src/auth/store.ts`)
   - Zustand store with methods:
     - `signup(email, password, name, options?)`
     - `verifyEmail(email, code, options?)`
     - `login(email, password, options?)`
     - `logout(options?)`
     - `hydrate(force?)` - Fetches current user
     - `requestPasswordReset(email, options?)`
     - `resetPassword(email, code, newPassword, options?)`
   - State: `{ user, status, error, pendingEmail }`
   - Status values: `'idle' | 'loading' | 'authenticated' | 'unauthenticated'`

2. **Auth Client** (`src/auth/authClient.ts`)
   - Wrapper around HTTP client for auth endpoints
   - Handles CSRF tokens automatically
   - All methods accept `debugLabel` for logging

3. **HTTP Client** (`src/lib/api/client.ts`)
   - Centralized HTTP client with:
     - Automatic CSRF token attachment
     - Cookie-based authentication (`credentials: 'include'`)
     - Automatic token refresh on 401
     - Retry logic and error handling

4. **Auth Hooks** (`src/auth/hooks.ts`)
   - `useHydrateAuth()` - Hook to hydrate auth on mount

### Testing Infrastructure

The `/api-testing` page demonstrates all functionality:
- Form inputs for email, password, name, verification codes
- Buttons for all auth operations
- Real-time status display (authenticated/unauthenticated)
- Account log showing all operations with HTTP details
- Users Monitor Panel (dev-only)
- Auto-fetching of verification/reset codes after operations

## UI Requirements

### Pages to Build

#### 1. Signup Page (`/signup`)
**File**: `src/auth/pages/SignupPage.jsx`

**Features**:
- Form with:
  - Email input
  - Password input (with strength indicator)
  - Name input (optional)
  - Sign up button
- After signup:
  - Show success message: "Verification email sent to {email}"
  - Automatically redirect to verification page OR show inline verification form
  - Pre-fill email in verification form
- Error handling:
  - Display validation errors
  - Show specific messages (e.g., "Email already registered")
- Loading states during submission

**UX Flow**:
1. User enters email, password, name
2. Clicks "Sign Up"
3. On success: Show message + verification code input (or redirect)
4. User enters 6-digit code
5. On verification success: Redirect to login or auto-login

#### 2. Verify Email Page (`/verify-email`)
**File**: `src/auth/pages/VerifyEmailPage.jsx`

**Features**:
- Form with:
  - Email input (pre-filled if coming from signup)
  - 6-digit verification code input (6 separate inputs or single input with masking)
  - "Verify Email" button
  - "Resend Code" button/link
- Code input UX:
  - Auto-focus next input as user types
  - Allow paste of full 6-digit code
  - Visual feedback for each digit
- After verification:
  - Show success message
  - Auto-redirect to login or dashboard
- Error handling:
  - Invalid/expired code messages
  - Already verified detection
- Dev mode hint:
  - In dev: Show button to fetch code from dev endpoint
  - Auto-fill code when fetched

**UX Flow**:
1. Display email (read-only or editable)
2. User enters 6-digit code
3. Auto-submit when 6 digits entered OR click verify
4. On success: Redirect to login/dashboard

#### 3. Login Page (`/login`)
**File**: `src/auth/pages/LoginPage.jsx`

**Features**:
- Form with:
  - Email input
  - Password input
  - "Remember me" checkbox (optional, for UI only)
  - "Sign In" button
  - "Forgot Password?" link
  - "Don't have an account? Sign up" link
- Error handling:
  - Invalid credentials
  - Email not verified (with link to resend verification)
  - Network errors
- Loading states during submission
- Auto-redirect if already authenticated
- After successful login:
  - Redirect to `/` (home/dashboard) or return URL

**UX Flow**:
1. User enters credentials
2. Clicks "Sign In"
3. On success: Redirect to home/dashboard
4. On error: Show specific error message

#### 4. Forgot Password Page (`/forgot-password`)
**File**: `src/auth/pages/ForgotPasswordPage.jsx`

**Features**:
- Form with:
  - Email input
  - "Send Reset Code" button
- After request:
  - Show success message: "Password reset code sent to {email}"
  - Automatically show code input form OR redirect to reset page
  - Pre-fill email in reset form
- "Back to Login" link
- Error handling:
  - Invalid email format
  - Network errors
- Loading states during submission

**UX Flow**:
1. User enters email
2. Clicks "Send Reset Code"
3. On success: Show message + code input form (or redirect)
4. User enters 6-digit code + new password
5. On success: Redirect to login

#### 5. Reset Password Page (`/reset-password`)
**File**: `src/auth/pages/ResetPasswordPage.jsx`

**Features**:
- Form with:
  - Email input (pre-filled if coming from forgot-password)
  - 6-digit reset code input
  - New password input
  - Confirm password input
  - "Reset Password" button
- Password requirements:
  - Show strength indicator
  - Match confirmation
  - Display requirements (min length, complexity)
- Code input UX:
  - Same as verification page (6 inputs or masked single input)
- After reset:
  - Show success message
  - Auto-redirect to login
- Error handling:
  - Invalid/expired code
  - Password validation errors
  - Network errors
- Dev mode hint:
  - In dev: Show button to fetch reset code from dev endpoint
  - Auto-fill code when fetched

**UX Flow**:
1. Display email (read-only or editable)
2. User enters 6-digit code
3. User enters new password twice
4. Click "Reset Password"
5. On success: Redirect to login

### Shared UI Components

#### AuthLayout Component
**File**: `src/auth/components/AuthLayout.jsx`

**Features**:
- Centered card layout
- Logo/branding at top
- Responsive design (mobile-friendly)
- Consistent styling across all auth pages
- Footer with links (Terms, Privacy, etc.)

#### CodeInput Component
**File**: `src/auth/components/CodeInput.jsx`

**Features**:
- 6 separate input fields (or single masked input)
- Auto-advance to next field on input
- Auto-focus first empty field
- Handle paste of full 6-digit code
- Visual feedback (focus, valid/invalid)
- Accessible (keyboard navigation, screen reader support)

#### PasswordInput Component
**File**: `src/auth/components/PasswordInput.jsx`

**Features**:
- Show/hide password toggle
- Strength indicator
- Validation feedback
- Requirements checklist
- Accessible

#### FormError Component
**File**: `src/auth/components/FormError.jsx`

**Features**:
- Consistent error message display
- Different styles for different error types
- Auto-dismiss option
- Accessible error announcements

### State Management Integration

All pages should use the auth store:

```javascript
import { useAuthStore } from '../store'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function LoginPage() {
  const { login, status, error, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const returnTo = location.state?.returnTo || '/'
      navigate(returnTo, { replace: true })
    }
  }, [status, navigate, location])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    // ... use login() from store
  }
  
  // ... rest of component
}
```

### Error Handling

Follow the error handling patterns from `/api-testing`:
- Display specific error messages from API responses
- Handle network errors gracefully
- Show loading states during async operations
- Provide actionable next steps (e.g., "Resend verification code")

### Routing Integration

Update `src/App.jsx` to include all auth routes:

```javascript
<Routes>
  {/* Auth routes - for unauthenticated users */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  <Route path="/verify-email" element={<VerifyEmailPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  
  {/* Protected routes - require authentication */}
  <Route path="/*" element={<AuthenticatedShell />} />
</Routes>
```

### Security Considerations

1. **CSRF Protection**: HTTP client handles automatically, no action needed
2. **Token Management**: Cookies are HttpOnly, handled by browser
3. **Password Visibility**: Allow toggle but default to hidden
4. **Rate Limiting**: Backend handles, show user-friendly messages if hit
5. **Email Verification**: Enforce before allowing login (backend handles)

### Accessibility Requirements

1. **Keyboard Navigation**: All forms fully keyboard accessible
2. **Screen Readers**: Proper ARIA labels and error announcements
3. **Focus Management**: Focus moves logically through forms
4. **Error Announcements**: Errors announced to screen readers
5. **Color Contrast**: Meet WCAG AA standards

### Testing Checklist

Before deploying, verify:
- [ ] Signup flow: Email → Verification → Login
- [ ] Login flow: Credentials → Dashboard
- [ ] Logout flow: Logout → Redirect to login
- [ ] Password reset flow: Request → Code → Reset → Login
- [ ] Email verification resend
- [ ] Error handling for all failure cases
- [ ] Loading states during async operations
- [ ] Redirect handling (return URL after login)
- [ ] Mobile responsiveness
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

## Reference Implementation

See `/api-testing` page (`src/pages/api-testing.jsx`) for:
- Complete form layouts
- Error handling patterns
- State management examples
- API client usage
- Loading/error state handling

## Dev Mode Features

In development, integrate:
- Auto-fetch verification codes after signup
- Auto-fetch reset codes after password reset request
- Use `fetchVerificationCode()` and `fetchPasswordResetCode()` from `src/auth/api.ts`
- Show dev hints when codes are available

## Implementation Steps

1. **Setup**: Create auth page components and routing
2. **Shared Components**: Build CodeInput, PasswordInput, AuthLayout
3. **Signup Flow**: Implement signup → verification → login
4. **Login Flow**: Implement login with error handling
5. **Password Reset Flow**: Implement forgot → reset → login
6. **Polish**: Add loading states, animations, accessibility
7. **Testing**: Test all flows and error cases
8. **Responsive**: Ensure mobile-friendly design

## Design Guidelines

- Use consistent styling with existing TimeBlocks design system
- Follow existing color palette and typography
- Match spacing and layout patterns from `/api-testing` page
- Use Tailwind CSS classes for consistency
- Keep forms clean and uncluttered
- Provide clear feedback for all user actions

## Notes

- All backend endpoints are fully tested and working
- Auth store and client infrastructure is complete
- HTTP client handles CSRF, cookies, token refresh automatically
- Focus on UI/UX and user experience
- Dev mode code fetching is optional but recommended for testing

