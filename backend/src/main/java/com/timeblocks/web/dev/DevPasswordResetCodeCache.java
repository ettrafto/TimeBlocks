package com.timeblocks.web.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dev-only in-memory cache for storing plaintext password reset codes.
 * This allows devs to retrieve password reset codes for testing without checking emails.
 * Should NOT be used in production.
 */
@Profile("dev")
@Component
public class DevPasswordResetCodeCache {
    
    private static class CodeEntry {
        final String code;
        final LocalDateTime expiresAt;
        
        CodeEntry(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
        
        boolean isExpired() {
            return expiresAt.isBefore(LocalDateTime.now());
        }
    }
    
    private final Map<String, CodeEntry> cache = new ConcurrentHashMap<>();
    
    /**
     * Store a password reset code for an email address.
     */
    public void store(String email, String code, LocalDateTime expiresAt) {
        String normalizedEmail = email.toLowerCase();
        cache.put(normalizedEmail, new CodeEntry(code, expiresAt));
        // Clean up expired entries periodically (simple approach - just check when storing)
        cleanup();
    }
    
    /**
     * Retrieve the most recent password reset code for an email address.
     * Returns null if no code exists or the code has expired.
     */
    public String get(String email) {
        String normalizedEmail = email.toLowerCase();
        CodeEntry entry = cache.get(normalizedEmail);
        if (entry == null || entry.isExpired()) {
            if (entry != null && entry.isExpired()) {
                cache.remove(normalizedEmail);
            }
            return null;
        }
        return entry.code;
    }
    
    /**
     * Remove the password reset code for an email (e.g., after successful reset).
     */
    public void remove(String email) {
        String normalizedEmail = email.toLowerCase();
        cache.remove(normalizedEmail);
    }
    
    private void cleanup() {
        // Simple cleanup - remove expired entries
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
}

