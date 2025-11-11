package com.timeblocks.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final long windowMs;
    private final int maxRequests;
    private final Map<String, Window> buckets = new ConcurrentHashMap<>();

    public RateLimiterService(
            @Value("${auth.rate-limit.window-ms:60000}") long windowMs,
            @Value("${auth.rate-limit.max:20}") int maxRequests
    ) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    public boolean tryConsume(String key) {
        long now = Instant.now().toEpochMilli();
        Window window = buckets.computeIfAbsent(key, k -> new Window(now, 0));
        synchronized (window) {
            if (now - window.windowStart >= windowMs) {
                window.windowStart = now;
                window.count = 0;
                log.debug("[RateLimiter] reset window key={}", key);
            }
            if (window.count >= maxRequests) {
                log.warn("[RateLimiter] limit exceeded key={} count={} max={}", key, window.count, maxRequests);
                return false;
            }
            window.count += 1;
            log.debug("[RateLimiter] consume key={} count={}/{}", key, window.count, maxRequests);
            return true;
        }
    }

    private static class Window {
        long windowStart;
        int count;

        Window(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}


