package com.timeblocks.security;

import com.timeblocks.config.AuthProperties;
import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final AuthTokenRepository authTokenRepository;
    private final JwtService jwtService;
    private final AuthProperties properties;
    private final ThreadLocal<MessageDigest> digestThreadLocal = ThreadLocal.withInitial(this::createDigest);

    public RefreshTokenService(AuthTokenRepository authTokenRepository, JwtService jwtService, AuthProperties properties) {
        this.authTokenRepository = authTokenRepository;
        this.jwtService = jwtService;
        this.properties = properties;
    }

    private MessageDigest createDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String hash(String token) {
        MessageDigest digest = digestThreadLocal.get();
        digest.reset();
        byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    @Transactional
    public RefreshTokenPair issue(User user) {
        UUID tokenId = UUID.randomUUID();
        String refreshJwt = jwtService.generateRefreshToken(tokenId, user.getId());

        AuthToken authToken = new AuthToken();
        authToken.setId(tokenId);
        authToken.setUser(user);
        authToken.setTokenHash(hash(refreshJwt));
        authToken.setExpiresAt(LocalDateTime.now().plusDays(properties.getRefreshTtlDays()));
        authTokenRepository.save(authToken);

        return new RefreshTokenPair(refreshJwt, authToken);
    }

    @Transactional
    public Optional<AuthToken> findActiveByToken(String rawToken) {
        return authTokenRepository.findByTokenHash(hash(rawToken))
                .filter(token -> !token.isRevoked() && token.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    @Transactional
    public void revoke(AuthToken token, boolean immediate) {
        if (token == null || token.isRevoked()) return;
        token.setRevokedAt(LocalDateTime.now());
        authTokenRepository.save(token);
        if (immediate) {
            UUID id = token.getId();
            if (id != null) {
                authTokenRepository.deleteById(id);
            }
        }
    }

    @Transactional
    public void revokeAllFor(User user) {
        authTokenRepository.findByUserAndRevokedAtIsNull(user)
                .forEach(token -> revoke(token, true));
    }

    public record RefreshTokenPair(String refreshToken, AuthToken entity) {
    }
}


