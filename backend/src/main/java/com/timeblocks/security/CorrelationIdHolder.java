package com.timeblocks.security;

import java.util.UUID;

/**
 * Thread-local holder for correlation IDs.
 * Provides access to the correlation ID throughout the request lifecycle.
 */
public class CorrelationIdHolder {
    
    private static final ThreadLocal<String> correlationId = new ThreadLocal<>();
    
    /**
     * Get the current correlation ID, or generate one if missing.
     */
    public static String get() {
        String cid = correlationId.get();
        if (cid == null || cid.isBlank()) {
            cid = UUID.randomUUID().toString();
            correlationId.set(cid);
        }
        return cid;
    }
    
    /**
     * Set the correlation ID for the current thread.
     */
    public static void set(String id) {
        if (id != null && !id.isBlank()) {
            correlationId.set(id);
        }
    }
    
    /**
     * Clear the correlation ID for the current thread.
     * Should be called at the end of request processing.
     */
    public static void clear() {
        correlationId.remove();
    }
}

