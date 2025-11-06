package com.timeblocks.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * TimeBlocks Pipeline Trace Logger
 * Provides toggleable logging with correlation IDs for tracing requests across layers
 */
public class TBLog {
    private static final Logger log = LoggerFactory.getLogger(TBLog.class);
    private static final String CORRELATION_ID_KEY = "correlationId";
    
    /**
     * Check if debug logging is enabled
     * Checks: TB_DEBUG env var, system property, or MDC context
     */
    public static boolean isEnabled() {
        String debugFlag = System.getenv("TB_DEBUG");
        if (debugFlag == null) {
            debugFlag = System.getProperty("TB_DEBUG");
        }
        if (debugFlag == null) {
            debugFlag = MDC.get("TB_DEBUG");
        }
        return "1".equals(debugFlag);
    }
    
    /**
     * Generate a new correlation ID
     */
    public static String newCorrelationId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "-" + System.currentTimeMillis();
    }
    
    /**
     * Set correlation ID in MDC for this thread
     */
    public static void setCorrelationId(String cid) {
        if (cid != null) {
            MDC.put(CORRELATION_ID_KEY, cid);
        }
    }
    
    /**
     * Get current correlation ID from MDC
     */
    public static String getCorrelationId() {
        return MDC.get(CORRELATION_ID_KEY);
    }
    
    /**
     * Clear correlation ID from MDC
     */
    public static void clearCorrelationId() {
        MDC.remove(CORRELATION_ID_KEY);
    }
    
    /**
     * Log a grouped section start (collapsed group in JS terms)
     */
    public static void groupStart(String label, String cid) {
        if (!isEnabled()) return;
        setCorrelationId(cid);
        log.info("🧭 {} [cid:{}]", label, cid);
    }
    
    /**
     * Log a grouped section end
     */
    public static void groupEnd() {
        if (!isEnabled()) return;
        // MDC will be cleared by filter/middleware
    }
    
    /**
     * Log info message
     */
    public static void info(String message, Object... args) {
        if (!isEnabled()) return;
        log.info("ℹ️ " + message, args);
    }
    
    /**
     * Log warning message
     */
    public static void warn(String message, Object... args) {
        if (!isEnabled()) return;
        log.warn("⚠️ " + message, args);
    }
    
    /**
     * Log error message
     */
    public static void error(String message, Throwable t) {
        if (!isEnabled()) return;
        log.error("🛑 " + message, t);
    }
    
    /**
     * Log error message without exception
     */
    public static void error(String message, Object... args) {
        if (!isEnabled()) return;
        log.error("🛑 " + message, args);
    }
    
    /**
     * Log key-value table (structured log)
     */
    public static void kv(String title, Map<String, Object> data) {
        if (!isEnabled()) return;
        log.info("📋 {}: {}", title, formatMap(data));
    }
    
    /**
     * Log key-value table from object (using reflection or toString)
     */
    public static void kv(String title, Object obj) {
        if (!isEnabled()) return;
        log.info("📋 {}: {}", title, obj != null ? obj.toString() : "null");
    }
    
    private static String formatMap(Map<String, Object> map) {
        if (map == null || map.isEmpty()) return "{}";
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(", ");
            sb.append(entry.getKey()).append("=").append(entry.getValue());
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }
}



