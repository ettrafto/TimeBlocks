package com.timeblocks.web;

import com.timeblocks.config.AuthProperties;
import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import com.timeblocks.security.AuthCookieNames;
import com.timeblocks.security.JwtService;
import com.timeblocks.security.RateLimiterService;
import com.timeblocks.security.RefreshTokenService;
import com.timeblocks.security.AppUserDetails;
import com.timeblocks.service.AuthService;
import com.timeblocks.service.AuthService.LoginResult;
import com.timeblocks.service.AuthService.VerificationResult;
import com.timeblocks.web.dto.auth.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final AuthTokenRepository authTokenRepository;
    private final JwtService jwtService;
    private final RateLimiterService rateLimiterService;
    private final AuthProperties authProperties;

    public AuthController(AuthService authService,
                          RefreshTokenService refreshTokenService,
                          AuthTokenRepository authTokenRepository,
                          JwtService jwtService,
                          RateLimiterService rateLimiterService,
                          AuthProperties authProperties) {
        this.authService = authService;
        this.refreshTokenService = refreshTokenService;
        this.authTokenRepository = authTokenRepository;
        this.jwtService = jwtService;
        this.rateLimiterService = rateLimiterService;
        this.authProperties = authProperties;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest servletRequest) {
        String cid = correlationId(servletRequest);
        String key = remoteKey(servletRequest);
        log.info("[Auth][Signup][cid={}] attempt email={} remote={}", cid, request.email(), key);
        log.debug("[Auth][Signup][cid={}] payload nameLength={} passwordLength={}", 
                cid, safeLength(request.name()), safeLength(request.password()));
        enforceRateLimit("signup:" + key, cid);
        try {
            authService.signup(request.email(), request.password(), request.name());
            log.info("[Auth][Signup][cid={}] success email={}", cid, request.email());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(java.util.Map.of("status", "verification_required"));
        } catch (RuntimeException ex) {
            log.warn("[Auth][Signup][cid={}] failure email={} reason={}", cid, request.email(), ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request,
                                         HttpServletRequest servletRequest) {
        String cid = correlationId(servletRequest);
        log.info("[Auth][VerifyEmail][cid={}] attempt email={} codeLength={}", cid, request.email(), safeLength(request.code()));
        try {
            VerificationResult result = authService.verifyEmail(request.email(), request.code());
            log.info("[Auth][VerifyEmail][cid={}] success email={} alreadyVerified={}", cid, request.email(), result.alreadyVerified());
            return ResponseEntity.ok(java.util.Map.of(
                    "verified", true,
                    "alreadyVerified", result.alreadyVerified(),
                    "verifiedAt", result.verifiedAt()
            ));
        } catch (RuntimeException ex) {
            log.warn("[Auth][VerifyEmail][cid={}] failure email={} reason={}", cid, request.email(), ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest servletRequest,
                                              HttpServletResponse response) {
        String cid = correlationId(servletRequest);
        String key = remoteKey(servletRequest);
        log.info("[Auth][Login][cid={}] attempt email={} remote={}", cid, request.email(), key);
        enforceRateLimit("login:" + key, cid);
        try {
            LoginResult loginResult = authService.login(request.email(), request.password());
            setAuthCookies(response, loginResult.accessToken(), loginResult.refreshTokenPair().refreshToken());
            UserResponse userResponse = UserResponse.from(loginResult.user());
            log.info("[Auth][Login][cid={}] success userId={} email={}", cid, userResponse.id(), userResponse.email());
            return ResponseEntity.ok(AuthResponse.of(userResponse));
        } catch (BadCredentialsException ex) {
            log.warn("[Auth][Login][cid={}] bad credentials email={}", cid, request.email());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of(
                    "error", "bad_credentials",
                    "message", "Invalid email or password"
            ));
        } catch (IllegalStateException ex) {
            log.warn("[Auth][Login][cid={}] blocked email={} reason={}", cid, request.email(), ex.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(java.util.Map.of(
                    "error", "login_blocked",
                    "message", ex.getMessage()
            ));
        } catch (IllegalArgumentException ex) {
            // Handle token/secret decoding errors and other invalid input
            String message = ex.getMessage();
            if (message != null && (message.contains("base64") || message.contains("Base64") || message.contains("Illegal"))) {
                log.error("[Auth][Login][cid={}] Base64 decoding error email={} reason={}", cid, request.email(), message, ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                        "error", "configuration_error",
                        "message", "Server configuration error: invalid secret encoding"
                ));
            }
            log.warn("[Auth][Login][cid={}] invalid input email={} reason={}", cid, request.email(), message);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of(
                    "error", "invalid_request",
                    "message", "Invalid request: " + message
            ));
        } catch (io.jsonwebtoken.JwtException ex) {
            // Handle JWT-related errors (token generation/parsing failures)
            log.error("[Auth][Login][cid={}] JWT error email={} reason={}", cid, request.email(), ex.getMessage(), ex);
            // Return 500 for JWT errors as they indicate server configuration issues
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                    "error", "token_error",
                    "message", "Token generation failed"
            ));
        } catch (RuntimeException ex) {
            log.error("[Auth][Login][cid={}] unexpected error email={} reason={}", cid, request.email(), ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                    "error", "login_error",
                    "message", "An unexpected error occurred during login"
            ));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        String cid = correlationId(request);
        try {
            Cookie refreshCookie = findCookie(request, AuthCookieNames.REFRESH)
                    .orElseThrow(() -> {
                        log.warn("[Auth][Refresh][cid={}] missing refresh cookie", cid);
                        return new IllegalArgumentException("Missing refresh token");
                    });
            String rawToken = refreshCookie.getValue();
            Jws<Claims> parsed = jwtService.parseRefreshToken(rawToken);
            String tokenIdStr = parsed.getPayload().getId();
            String userIdStr = parsed.getPayload().getSubject();
            if (tokenIdStr == null || userIdStr == null) {
                log.warn("[Auth][Refresh][cid={}] token missing subject or id", cid);
                throw new IllegalArgumentException("Invalid refresh token");
            }
            UUID tokenId = UUID.fromString(tokenIdStr);
            UUID userId = UUID.fromString(userIdStr);

            AuthToken stored = refreshTokenService.findActiveByToken(rawToken)
                    .orElseGet(() -> handlePotentialReuse(tokenId));
            if (!stored.getId().equals(tokenId) || !stored.getUser().getId().equals(userId)) {
                log.warn("[Auth][Refresh][cid={}] token mismatch storedId={} expectedId={} storedUser={} expectedUser={}",
                        cid, stored.getId(), tokenId, stored.getUser().getId(), userId);
                refreshTokenService.revoke(stored, true);
                throw new IllegalArgumentException("Invalid refresh token");
            }

            RefreshTokenService.RefreshTokenPair newPair = authService.rotateRefresh(stored, stored.getUser());
            String newAccess = jwtService.generateAccessToken(userId, java.util.Map.of(
                    "role", stored.getUser().getRole().name(),
                    "email", stored.getUser().getEmail()
            ));
            setAuthCookies(response, newAccess, newPair.refreshToken());
            log.info("[Auth][Refresh][cid={}] success userId={} tokenId={}", cid, userId, tokenId);
            return ResponseEntity.ok(java.util.Map.of("status", "refreshed"));
        } catch (RuntimeException ex) {
            log.warn("[Auth][Refresh][cid={}] failure reason={}", cid, ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String cid = correlationId(request);
        boolean refreshPresent = false;
        Optional<Cookie> refreshCookie = findCookie(request, AuthCookieNames.REFRESH);
        if (refreshCookie.isPresent()) {
            refreshPresent = true;
            try {
                Jws<Claims> parsed = jwtService.parseRefreshToken(refreshCookie.get().getValue());
                Optional.ofNullable(parsed.getPayload().getId())
                        .map(UUID::fromString)
                        .ifPresent(id -> authTokenRepository.findById(id)
                                .ifPresent(token -> refreshTokenService.revoke(token, true)));
            } catch (Exception ex) {
                log.debug("[Auth][Logout][cid={}] failed to parse refresh cookie reason={}", cid, ex.getMessage());
            }
        }
        clearAuthCookies(response);
        SecurityContextHolder.clearContext();
        log.info("[Auth][Logout][cid={}] user cleared session refreshCookiePresent={}", cid, refreshPresent);
        return ResponseEntity.ok(java.util.Map.of("status", "logged_out"));
    }

    @PostMapping("/request-password-reset")
    public ResponseEntity<?> requestPasswordReset(@Valid @RequestBody RequestPasswordResetRequest request,
                                                  HttpServletRequest servletRequest) {
        String cid = correlationId(servletRequest);
        String emailKey = request.email().toLowerCase(Locale.ROOT);
        log.info("[Auth][PasswordResetRequest][cid={}] email={}", cid, emailKey);
        enforceRateLimit("pwdreset:" + emailKey, cid);
        authService.requestPasswordReset(request.email());
        return ResponseEntity.ok(java.util.Map.of("status", "reset_requested"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request,
                                           HttpServletRequest servletRequest) {
        String cid = correlationId(servletRequest);
        log.info("[Auth][ResetPassword][cid={}] email={} codeLength={} newPasswordLength={}", 
                cid, request.email(), safeLength(request.code()), safeLength(request.newPassword()));
        try {
            authService.resetPassword(request.email(), request.code(), request.newPassword());
            return ResponseEntity.ok(java.util.Map.of("status", "password_updated"));
        } catch (RuntimeException ex) {
            log.warn("[Auth][ResetPassword][cid={}] failure email={} reason={}", cid, request.email(), ex.getMessage());
            throw ex;
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserDetails principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        log.debug("[Auth][Me] resolved principal userId={}", principal.getUser().getId());
        User user = principal.getUser();
        return ResponseEntity.ok(AuthResponse.of(UserResponse.from(user)));
    }

    @GetMapping("/csrf")
    public ResponseEntity<java.util.Map<String, String>> csrf(CsrfToken token) {
        log.debug("[Auth][CSRF] token issued");
        return ResponseEntity.ok(java.util.Map.of("token", token.getToken()));
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        ResponseCookie accessCookie = buildCookie(AuthCookieNames.ACCESS, accessToken, authProperties.getAccessTtlMinutes() * 60)
                .build();
        ResponseCookie refreshCookie = buildCookie(AuthCookieNames.REFRESH, refreshToken, authProperties.getRefreshTtlDays() * 24 * 3600)
                .build();
        String accessCookieStr = accessCookie.toString();
        String refreshCookieStr = refreshCookie.toString();
        log.info("[Auth][Cookies] setting ACCESS cookie: name={} path={} sameSite={} secure={} httpOnly={} maxAge={}", 
            AuthCookieNames.ACCESS, accessCookie.getPath(), accessCookie.getSameSite(), 
            accessCookie.isSecure(), accessCookie.isHttpOnly(), accessCookie.getMaxAge());
        log.info("[Auth][Cookies] setting REFRESH cookie: name={} path={} sameSite={} secure={} httpOnly={} maxAge={}", 
            AuthCookieNames.REFRESH, refreshCookie.getPath(), refreshCookie.getSameSite(), 
            refreshCookie.isSecure(), refreshCookie.isHttpOnly(), refreshCookie.getMaxAge());
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookieStr);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookieStr);
    }

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie accessCookie = buildCookie(AuthCookieNames.ACCESS, "", 0)
                .maxAge(0)
                .value("")
                .build();
        ResponseCookie refreshCookie = buildCookie(AuthCookieNames.REFRESH, "", 0)
                .maxAge(0)
                .value("")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    private ResponseCookie.ResponseCookieBuilder buildCookie(String name, String value, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(authProperties.isCookieSecure())
                .path("/")
                .sameSite(Objects.requireNonNullElse(authProperties.getCookieSameSite(), "Lax"))
                .maxAge(Math.max(0, maxAgeSeconds));
        if (authProperties.getCookieDomain() != null && !authProperties.getCookieDomain().isBlank()) {
            builder.domain(authProperties.getCookieDomain());
        }
        return builder;
    }

    private Optional<Cookie> findCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return Optional.empty();
        for (Cookie cookie : request.getCookies()) {
            if (cookie.getName().equals(name)) {
                return Optional.of(cookie);
            }
        }
        return Optional.empty();
    }

    private void enforceRateLimit(String key, String cid) {
        if (!rateLimiterService.tryConsume(key)) {
            log.warn("[Auth][RateLimit][cid={}] throttled key={}", cid, key);
            throw new IllegalStateException("Too many requests");
        }
    }

    private String remoteKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private AuthToken handlePotentialReuse(UUID tokenId) {
        log.warn("[Auth][Refresh] potential reuse detected tokenId={}", tokenId);
        AuthToken token = authTokenRepository.findById(tokenId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        refreshTokenService.revokeAllFor(token.getUser());
        throw new IllegalArgumentException("Refresh token has been revoked");
    }

    private String correlationId(HttpServletRequest request) {
        // Use CorrelationIdHolder if available, otherwise fall back to header
        try {
            String cid = com.timeblocks.security.CorrelationIdHolder.get();
            if (cid != null && !cid.isBlank()) {
                return cid;
            }
        } catch (Exception e) {
            // Fall through to header check
        }
        return Optional.ofNullable(request.getHeader("X-Correlation-Id"))
                .orElse("no-cid");
    }

    private int safeLength(String value) {
        return value == null ? 0 : value.length();
    }
}


