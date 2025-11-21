package com.timeblocks.web.dev;

import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import com.timeblocks.repo.UserRepository;
import jakarta.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Profile("dev")
@RestController
@RequestMapping("/api/dev")
public class DevUsersController {

    private static final Logger log = LoggerFactory.getLogger(DevUsersController.class);
    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final DevVerificationCodeCache verificationCodeCache;
    @Nullable
    private final DevPasswordResetCodeCache passwordResetCodeCache;

    public DevUsersController(
            UserRepository userRepository, 
            AuthTokenRepository authTokenRepository, 
            DevVerificationCodeCache verificationCodeCache,
            @Autowired(required = false) DevPasswordResetCodeCache passwordResetCodeCache
    ) {
        this.userRepository = userRepository;
        this.authTokenRepository = authTokenRepository;
        this.verificationCodeCache = verificationCodeCache;
        this.passwordResetCodeCache = passwordResetCodeCache;
        log.debug("[DevUsersController] Initialized with passwordResetCodeCache: {}", passwordResetCodeCache != null ? "available" : "null");
    }

    @GetMapping("/users")
    public List<DevUserResponse> listUsers() {
        LocalDateTime now = LocalDateTime.now();
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"))
                .stream()
                .map(user -> mapUser(user, now))
                .toList();
    }

    @GetMapping("/verification-code/{email}")
    public ResponseEntity<?> getVerificationCode(@PathVariable String email) {
        String normalizedEmail = email.toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of(
                    "email", email,
                    "code", null,
                    "message", "User not found"
            ));
        }

        // Get the verification code from dev cache
        String code = verificationCodeCache.get(normalizedEmail);
        if (code == null) {
            return ResponseEntity.ok(Map.of(
                    "email", email,
                    "code", null,
                    "message", "No active verification code found. Make sure you've recently signed up and the code hasn't expired."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "email", email,
                "code", code
        ));
    }

    @GetMapping("/password-reset-code/{email}")
    public ResponseEntity<?> getPasswordResetCode(@PathVariable String email) {
        try {
            log.debug("[DevUsersController][getPasswordResetCode] request email={}", email);
            String normalizedEmail = email.toLowerCase();
            User user = userRepository.findByEmail(normalizedEmail).orElse(null);
            if (user == null) {
                log.debug("[DevUsersController][getPasswordResetCode] user not found email={}", email);
                return ResponseEntity.ok(Map.of(
                        "email", email,
                        "code", null,
                        "message", "User not found"
                ));
            }

            // Get the password reset code from dev cache
            // Note: passwordResetCodeCache should never be null in dev profile, but we check anyway
            if (passwordResetCodeCache == null) {
                log.error("[DevUsersController][getPasswordResetCode] passwordResetCodeCache is null for email={}", email);
                return ResponseEntity.ok(Map.of(
                        "email", email,
                        "code", null,
                        "message", "Password reset code cache not available. Make sure you're running in dev profile."
                ));
            }

            String code = passwordResetCodeCache.get(normalizedEmail);
            if (code == null) {
                log.debug("[DevUsersController][getPasswordResetCode] no code found email={}", email);
                return ResponseEntity.ok(Map.of(
                        "email", email,
                        "code", null,
                        "message", "No active password reset code found. Make sure you've recently requested a password reset and the code hasn't expired."
                ));
            }

            log.debug("[DevUsersController][getPasswordResetCode] code found email={}", email);
            return ResponseEntity.ok(Map.of(
                    "email", email,
                    "code", code
            ));
        } catch (Exception e) {
            log.error("[DevUsersController][getPasswordResetCode] exception for email={}", email, e);
            throw e; // Re-throw to let GlobalExceptionHandler handle it with proper logging
        }
    }

    private DevUserResponse mapUser(User user, LocalDateTime now) {
        List<AuthToken> activeTokens = authTokenRepository.findByUserAndRevokedAtIsNull(user)
                .stream()
                .filter(token -> token.getExpiresAt() != null && token.getExpiresAt().isAfter(now))
                .toList();

        boolean authenticated = !activeTokens.isEmpty();
        LocalDateTime lastLoginAt = activeTokens.stream()
                .map(AuthToken::getCreatedAt)
                .max(Comparator.naturalOrder())
                .orElse(null);
        boolean loggedInRecently = lastLoginAt != null && lastLoginAt.isAfter(now.minusDays(1));

        String role = user.getRole() != null ? user.getRole().name() : "UNKNOWN";
        boolean verified = user.getEmailVerifiedAt() != null;
        boolean active = user.getUpdatedAt() != null;

        return new DevUserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                role,
                verified,
                active,
                authenticated,
                loggedInRecently,
                user.getEmailVerifiedAt(),
                lastLoginAt,
                user.getCreatedAt(),
                user.getUpdatedAt(),
                activeTokens.size()
        );
    }

    public record DevUserResponse(
            UUID id,
            String email,
            String name,
            String role,
            boolean verified,
            boolean active,
            boolean authenticated,
            boolean loggedInRecently,
            LocalDateTime verifiedAt,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int activeSessionCount
    ) {
    }
}


