package com.timeblocks.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class LoggingAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(LoggingAuthenticationEntryPoint.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        // Log cookie information
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        String cookieSummary = cookies != null 
            ? java.util.Arrays.stream(cookies)
                .map(c -> c.getName() + (c.getName().contains("ACCESS") || c.getName().contains("REFRESH") ? "=present" : ""))
                .filter(s -> s.contains("ACCESS") || s.contains("REFRESH"))
                .collect(java.util.stream.Collectors.joining(", "))
            : "none";
        
        // Get correlation ID from holder (set by CorrelationIdFilter)
        String cid = CorrelationIdHolder.get();
        
        log.warn("[Security][AuthEntryPoint] path={} method={} reason={} cookies={} cid={}",
                path,
                method,
                authException.getMessage(),
                cookieSummary.isEmpty() ? "no-auth-cookies" : cookieSummary,
                cid);
        
        // Return JSON 401 response for SPA with enhanced error details
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        Map<String, Object> body = new HashMap<>();
        body.put("error", "unauthorized");
        body.put("status", 401);
        body.put("message", "Full authentication is required to access this resource");
        body.put("path", path);
        body.put("timestamp", Instant.now().toString());
        if (cid != null && !cid.isBlank()) {
            body.put("correlationId", cid);
        }
        
        objectMapper.writeValue(response.getWriter(), body);
    }
}


