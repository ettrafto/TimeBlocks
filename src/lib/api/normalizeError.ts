/**
 * Error normalization utility for TimeBlocks frontend
 * 
 * Provides a canonical error shape (TBError) that all HTTP clients
 * and API layers use, ensuring consistent error handling across the app.
 * 
 * This normalizer extracts error information from:
 * - HTTP Response objects
 * - Fetch/network errors
 * - Existing error objects from http.js or api.js
 * - Backend JSON error responses
 */

export type TBError = {
  status: number | null;        // HTTP status or null for network/unknown
  code: string | null;          // "unauthorized", "network_error", etc.
  message: string;              // human-readable
  details?: any;                // optional structured payload
  cid?: string | null;          // correlation ID if available
  url?: string | null;          // request URL
  method?: string | null;       // HTTP method
  isAbort?: boolean;            // true if AbortError / timeout
  raw?: unknown;                // original error / response body
};

/**
 * Normalize an error from various sources into a canonical TBError shape.
 * 
 * @param input - Error source (Response, Error, object, etc.)
 * @param context - Optional context (url, method, cid)
 * @returns Normalized TBError
 */
export function normalizeError(
  input: unknown,
  context?: {
    url?: string;
    method?: string;
    cid?: string;
    response?: Response;
  }
): TBError {
  const error: TBError = {
    status: null,
    code: null,
    message: 'Unknown error',
    cid: context?.cid || null,
    url: context?.url || null,
    method: context?.method || null,
    isAbort: false,
    raw: input,
  };

  // Extract correlation ID from response header if available
  if (context?.response) {
    const cidHeader = context.response.headers.get('X-Correlation-Id');
    if (cidHeader) {
      error.cid = cidHeader;
    }
    error.status = context.response.status;
  }

  // Handle Response objects
  if (input instanceof Response) {
    error.status = input.status;
    error.url = input.url;
    // Try to extract error body (will be handled below if input is already parsed)
  }

  // Handle Error objects
  if (input instanceof Error) {
    error.message = input.message;
    
    // Check for abort/timeout
    if (input.name === 'AbortError' || input.name === 'TimeoutError') {
      error.isAbort = true;
      error.code = 'abort_error';
      error.message = input.message || 'Request aborted or timed out';
    }
    
    // Check for network errors
    if (input.message.includes('fetch') || input.message.includes('network')) {
      error.code = 'network_error';
    }
    
    // Extract status from error if present
    if ('status' in input && typeof (input as any).status === 'number') {
      error.status = (input as any).status;
    }
    
    // Extract code from error if present
    if ('code' in input && typeof (input as any).code === 'string') {
      error.code = (input as any).code;
    }
    
    // Extract cid from error if present
    if ('cid' in input && typeof (input as any).cid === 'string') {
      error.cid = (input as any).cid;
    }
    
    // Extract details from error if present
    if ('details' in input) {
      error.details = (input as any).details;
    }
  }

  // Handle objects (parsed JSON responses, existing error objects)
  if (input && typeof input === 'object' && !(input instanceof Error) && !(input instanceof Response)) {
    const obj = input as any;
    
    // Extract status
    if (typeof obj.status === 'number') {
      error.status = obj.status;
    }
    
    // Extract code/error
    if (typeof obj.code === 'string') {
      error.code = obj.code;
    } else if (typeof obj.error === 'string') {
      error.code = obj.error;
    } else if (typeof obj.errorCode === 'string') {
      error.code = obj.errorCode;
    }
    
    // Extract message
    if (typeof obj.message === 'string') {
      error.message = obj.message;
    } else if (typeof obj.error === 'string' && !error.code) {
      // If error is a string and we haven't set code yet, use it as message
      error.message = obj.error;
    }
    
    // Extract details
    if (obj.details !== undefined) {
      error.details = obj.details;
    } else if (obj.errors !== undefined) {
      error.details = obj.errors;
    }
    
    // Extract cid
    if (typeof obj.cid === 'string') {
      error.cid = obj.cid;
    }
    
    // Extract url/method if present
    if (typeof obj.url === 'string') {
      error.url = obj.url;
    }
    if (typeof obj.method === 'string') {
      error.method = obj.method;
    }
    
    // Extract isAbort
    if (typeof obj.abort === 'boolean') {
      error.isAbort = obj.abort;
    }
  }

  // Handle strings
  if (typeof input === 'string') {
    error.message = input;
  }

  // Fallback message if still default
  if (error.message === 'Unknown error' && error.status) {
    if (error.status === 401) {
      error.message = 'Unauthorized';
      if (!error.code) error.code = 'unauthorized';
    } else if (error.status === 403) {
      error.message = 'Forbidden';
      if (!error.code) error.code = 'forbidden';
    } else if (error.status === 404) {
      error.message = 'Not found';
      if (!error.code) error.code = 'not_found';
    } else if (error.status === 500) {
      error.message = 'Internal server error';
      if (!error.code) error.code = 'server_error';
    } else {
      error.message = `HTTP ${error.status}`;
    }
  }

  // Ensure code is set for common cases
  if (!error.code) {
    if (error.isAbort) {
      error.code = 'abort_error';
    } else if (error.status === null) {
      error.code = 'network_error';
    } else {
      error.code = 'unknown_error';
    }
  }

  return error;
}

/**
 * Check if an error is a TBError
 */
export function isTBError(error: unknown): error is TBError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

