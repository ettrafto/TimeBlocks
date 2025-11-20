package com.timeblocks.service;

import com.timeblocks.model.*;
import com.timeblocks.repo.EmailVerificationRepository;
import com.timeblocks.repo.PasswordResetRepository;
import com.timeblocks.repo.UserRepository;
import com.timeblocks.security.AppUserDetails;
import com.timeblocks.security.HashUtils;
import com.timeblocks.security.JwtService;
import com.timeblocks.security.RefreshTokenService;
import com.timeblocks.security.RefreshTokenService.RefreshTokenPair;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthNotificationService notificationService;
    private final AuthenticationManager authenticationManager;
    private final SecureRandom secureRandom = new SecureRandom();
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthService.class);

    public AuthService(
            UserRepository userRepository,
            EmailVerificationRepository emailVerificationRepository,
            PasswordResetRepository passwordResetRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            AuthNotificationService notificationService,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.notificationService = notificationService;
        this.authenticationManager = authenticationManager;
    }

    public record LoginResult(User user, String accessToken, RefreshTokenPair refreshTokenPair) { }

    public record VerificationResult(boolean alreadyVerified, LocalDateTime verifiedAt) { }

    @Transactional
    public User signup(String email, String password, String name) {
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setName(name != null && !name.isBlank() ? name : null);
        user.setRole(UserRole.USER);
        User saved = userRepository.save(user);
        createEmailVerification(saved);
        return saved;
    }

    private void createEmailVerification(User user) {
        emailVerificationRepository.deleteByUserAndExpiresAtBefore(user, LocalDateTime.now());
        String code = generateCode();
        EmailVerification verification = new EmailVerification();
        verification.setUser(user);
        verification.setCode(HashUtils.sha256(code));
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        emailVerificationRepository.save(verification);
        notificationService.sendEmailVerification(user.getEmail(), code);
    }

    private String generateCode() {
        int value = secureRandom.nextInt(1_000_000);
        return String.format("%06d", value);
    }

    @Transactional
    public VerificationResult verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getEmailVerifiedAt() != null) {
            return new VerificationResult(true, user.getEmailVerifiedAt());
        }
        String hashed = HashUtils.sha256(code);
        EmailVerification verification = emailVerificationRepository
                .findFirstByUserAndCodeAndUsedAtIsNull(user, hashed)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification code"));
        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification code expired");
        }
        verification.setUsedAt(LocalDateTime.now());
        emailVerificationRepository.save(verification);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        return new VerificationResult(false, user.getEmailVerifiedAt());
    }

    @Transactional
    public LoginResult login(String email, String password) {
        String normalized = email.toLowerCase(Locale.ROOT);
        log.debug("[AuthService][login] attempt normalizedEmail={} rawEmail={}", normalized, email);
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalized, password));
        log.debug("[AuthService][login] authenticationManager returned principal={}", auth.getPrincipal());
        AppUserDetails principal = (AppUserDetails) auth.getPrincipal();
        User user = principal.getUser();
        log.debug("[AuthService][login] principal user id={} email={} verifiedAt={} role={}",
                user.getId(), user.getEmail(), user.getEmailVerifiedAt(), user.getRole());
        if (user.getEmailVerifiedAt() == null) {
            log.warn("[AuthService][login] email not verified userId={} email={}", user.getId(), user.getEmail());
            throw new IllegalStateException("Email not verified");
        }
        String accessToken = jwtService.generateAccessToken(user.getId(), java.util.Map.of(
                "role", user.getRole().name(),
                "email", user.getEmail()
        ));
        RefreshTokenPair refreshTokenPair = refreshTokenService.issue(user);
        log.info("[AuthService][login] success userId={} email={} role={} verifiedAt={}",
                user.getId(), user.getEmail(), user.getRole(), user.getEmailVerifiedAt());
        return new LoginResult(user, accessToken, refreshTokenPair);
    }

    @Transactional
    public void logout(AuthToken refreshToken) {
        refreshTokenService.revoke(refreshToken, true);
    }

    @Transactional
    public RefreshTokenPair rotateRefresh(AuthToken token, User user) {
        return refreshTokenService.rotateRefresh(token, user);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email.toLowerCase(Locale.ROOT)).ifPresent(user -> {
            passwordResetRepository.deleteByUserAndExpiresAtBefore(user, LocalDateTime.now());
            String code = generateCode();
            PasswordReset reset = new PasswordReset();
            reset.setUser(user);
            reset.setCode(HashUtils.sha256(code));
            reset.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            passwordResetRepository.save(reset);
            notificationService.sendPasswordReset(user.getEmail(), code);
        });
        // Always return success to prevent enumeration.
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String hashed = HashUtils.sha256(code);
        PasswordReset reset = passwordResetRepository
                .findFirstByUserAndCodeAndUsedAtIsNull(user, hashed)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset code"));
        if (reset.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset code expired");
        }
        reset.setUsedAt(LocalDateTime.now());
        passwordResetRepository.save(reset);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenService.revokeAllFor(user);
    }
}


