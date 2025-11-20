/**
 * Shared logging utilities for TimeBlocks frontend
 * 
 * Provides consistent logging format with structured tags and correlation IDs.
 * All logs follow the pattern: [Tag] message CID=<cid> extra={...}
 * 
 * Tag conventions:
 * - [HTTP] - HTTP client (client.ts) requests/responses
 * - [API] - API service layer (api.js) requests/responses
 * - [Auth][Bootstrap][Hydrate] - Auth hydration flow
 * - [Auth][Bootstrap][Me] - /api/auth/me calls
 * - [Auth][Login] - Login flow
 * - [Auth][Logout] - Logout flow
 * - [Auth][Refresh] - Token refresh attempts
 * - [Auth][CookieCheck] - Cookie availability checks
 * - [DataLoad][Types] - Event types loading
 * - [DataLoad][Events] - Scheduled events loading
 * - [DataLoad][Schedules] - Schedule occurrences loading
 * - [DataLoad][EventsStore] - Events store initialization
 * 
 * All logs include correlation IDs (CID) when available for request tracing.
 */

export interface LogContext {
  cid?: string;
  [key: string]: any;
}

/**
 * Format a log message with tag and context
 */
function formatLog(tag: string, message: string, context?: LogContext): string {
  const parts = [`[${tag}]`, message];
  if (context?.cid) {
    parts.push(`CID=${context.cid}`);
  }
  return parts.join(' ');
}

/**
 * Log info message
 */
export function logInfo(tag: string, message: string, extra?: LogContext): void {
  const formatted = formatLog(tag, message, extra);
  if (extra && Object.keys(extra).length > 0) {
    console.log(formatted, extra);
  } else {
    console.log(formatted);
  }
}

/**
 * Log warning message
 */
export function logWarn(tag: string, message: string, extra?: LogContext): void {
  const formatted = formatLog(tag, message, extra);
  if (extra && Object.keys(extra).length > 0) {
    console.warn(formatted, extra);
  } else {
    console.warn(formatted);
  }
}

/**
 * Log error message
 */
export function logError(tag: string, message: string, extra?: LogContext): void {
  const formatted = formatLog(tag, message, extra);
  if (extra && Object.keys(extra).length > 0) {
    console.error(formatted, extra);
  } else {
    console.error(formatted);
  }
}

/**
 * Log debug message (only in development)
 */
export function logDebug(tag: string, message: string, extra?: LogContext): void {
  if (import.meta.env.DEV) {
    const formatted = formatLog(tag, message, extra);
    if (extra && Object.keys(extra).length > 0) {
      console.debug(formatted, extra);
    } else {
      console.debug(formatted);
    }
  }
}

/**
 * Log an error object (TBError) with structured format
 */
export function logTBError(tag: string, error: { status: number | null; code: string | null; message: string; cid?: string | null }, context?: LogContext): void {
  const extra: LogContext = {
    ...context,
    errorStatus: error.status,
    errorCode: error.code,
    errorMessage: error.message,
  };
  if (error.cid) {
    extra.cid = error.cid;
  }
  logError(tag, `Error: ${error.message}`, extra);
}

