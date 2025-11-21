/**
 * Authentication route constants
 * Centralized definition of all auth routes to avoid magic strings
 */

export const AUTH_ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
};

export const AUTH_ROUTE_PATHS = Object.values(AUTH_ROUTES);

/**
 * Check if a pathname is an auth route
 * @param {string} pathname - The pathname to check
 * @returns {boolean}
 */
export function isAuthRoute(pathname) {
  return AUTH_ROUTE_PATHS.includes(pathname);
}

/**
 * Check if a return URL is valid (not an auth route and not external)
 * @param {string} returnTo - The return URL to validate
 * @returns {boolean}
 */
export function isValidReturnUrl(returnTo) {
  if (!returnTo || typeof returnTo !== 'string') {
    return false;
  }
  
  // Reject external URLs
  if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
    return false;
  }
  
  // Reject auth routes as return URLs
  if (isAuthRoute(returnTo)) {
    return false;
  }
  
  // Must start with /
  if (!returnTo.startsWith('/')) {
    return false;
  }
  
  return true;
}

