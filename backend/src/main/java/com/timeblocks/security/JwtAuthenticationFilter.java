package com.timeblocks.security;

import com.timeblocks.model.User;
import com.timeblocks.repo.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import java.io.IOException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String cid = CorrelationIdHolder.get();
        
        // Check for auth cookies
        boolean hasAccessCookie = WebUtils.getCookie(request, AuthCookieNames.ACCESS) != null;
        boolean hasRefreshCookie = WebUtils.getCookie(request, AuthCookieNames.REFRESH) != null;
        
        log.debug("[JWT][Filter] path={} method={} hasAccessCookie={} hasRefreshCookie={} cid={}", 
            path, method, hasAccessCookie, hasRefreshCookie, cid);

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            Cookie cookie = WebUtils.getCookie(request, AuthCookieNames.ACCESS);
            if (cookie != null) {
                log.debug("[JWT][Filter] ACCESS cookie found path={} method={} cid={}", path, method, cid);
                authenticateWithToken(cookie.getValue(), request, path, method, cid);
            } else {
                log.debug("[JWT][Filter] no ACCESS cookie path={} method={} reason=jwt_missing cid={}", 
                    path, method, cid);
            }
        } else {
            log.debug("[JWT][Filter] already authenticated path={} method={} cid={}", path, method, cid);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateWithToken(String token, HttpServletRequest request, String path, String method, String cid) {
        String reason = null;
        try {
            Jws<Claims> parsed = jwtService.parseAccessToken(token);
            String subject = parsed.getPayload().getSubject();
            if (subject == null) {
                reason = "jwt_malformed";
                log.warn("[JWT][Filter] token missing subject path={} method={} reason={} cid={}", 
                    path, method, reason, cid);
                return;
            }
            UUID userId = UUID.fromString(subject);
            Optional<User> userOptional = userRepository.findById(Objects.requireNonNull(userId));
            if (userOptional.isEmpty()) {
                reason = "jwt_user_not_found";
                log.warn("[JWT][Filter] user not found userId={} path={} method={} reason={} cid={}", 
                    userId, path, method, reason, cid);
                return;
            }
            User user = userOptional.get();
            AppUserDetails principal = new AppUserDetails(user);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("[JWT][Filter] authenticated userId={} email={} path={} method={} reason=valid cid={}", 
                userId, user.getEmail(), path, method, cid);
        } catch (ExpiredJwtException ex) {
            reason = "jwt_expired";
            log.warn("[JWT][Filter] expired token path={} method={} reason={} cid={}", 
                path, method, reason, cid);
        } catch (MalformedJwtException | SignatureException ex) {
            reason = "jwt_malformed";
            log.warn("[JWT][Filter] malformed token path={} method={} reason={} cid={}", 
                path, method, reason, cid);
        } catch (JwtException ex) {
            reason = "jwt_signature_invalid";
            log.warn("[JWT][Filter] invalid signature path={} method={} reason={} cid={}", 
                path, method, reason, cid);
        } catch (Exception ex) {
            reason = "jwt_malformed";
            log.warn("[JWT][Filter] token validation failed path={} method={} reason={} error={} cid={}", 
                path, method, reason, ex.getClass().getSimpleName(), cid);
        }
    }
}


