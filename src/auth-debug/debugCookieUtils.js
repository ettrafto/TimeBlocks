/**
 * Cookie utilities for auth debugging
 */

/**
 * Get a cookie value by name
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Parse all cookies into an object
 */
export function parseAllCookies() {
  if (typeof document === 'undefined') return {};
  const cookies = {};
  document.cookie.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name) {
      cookies[name] = value || '';
    }
  });
  return cookies;
}

/**
 * Render cookie state for display
 * Returns object with tb_access and tb_refresh presence and length
 */
export function renderCookieState() {
  const cookies = parseAllCookies();
  const access = cookies.tb_access || null;
  const refresh = cookies.tb_refresh || null;
  return {
    tb_access: {
      present: !!access,
      length: access ? access.length : 0,
      preview: access ? `${access.substring(0, 20)}...` : null,
    },
    tb_refresh: {
      present: !!refresh,
      length: refresh ? refresh.length : 0,
      preview: refresh ? `${refresh.substring(0, 20)}...` : null,
    },
    xsrf_token: {
      present: !!cookies.XSRF_TOKEN,
      value: cookies.XSRF_TOKEN || null,
    },
  };
}

