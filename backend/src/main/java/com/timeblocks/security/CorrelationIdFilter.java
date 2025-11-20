package com.timeblocks.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter to extract and propagate correlation IDs.
 * 
 * - Reads X-Correlation-Id header from request
 * - If present, uses it; otherwise generates a UUID
 * - Stores in ThreadLocal via CorrelationIdHolder
 * - Echoes back in response header
 * - Clears ThreadLocal after request
 */
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            // Extract or generate correlation ID
            String correlationId = request.getHeader(CORRELATION_ID_HEADER);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = java.util.UUID.randomUUID().toString();
            }
            
            // Store in ThreadLocal
            CorrelationIdHolder.set(correlationId);
            
            // Echo back in response header
            response.setHeader(CORRELATION_ID_HEADER, correlationId);
            
            // Continue filter chain
            filterChain.doFilter(request, response);
        } finally {
            // Always clear ThreadLocal to prevent memory leaks
            CorrelationIdHolder.clear();
        }
    }
}

