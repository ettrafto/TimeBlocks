package com.timeblocks.security;

import com.timeblocks.config.AuthProperties;
import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

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
        String cid = CorrelationIdHolder.get();
        UUID tokenId = UUID.randomUUID();
        String refreshJwt = jwtService.generateRefreshToken(tokenId, user.getId());

        AuthToken authToken = new AuthToken();
        authToken.setId(tokenId);
        authToken.setUser(user);
        authToken.setTokenHash(hash(refreshJwt));
        authToken.setExpiresAt(LocalDateTime.now().plusDays(properties.getRefreshTtlDays()));
        authTokenRepository.save(authToken);

        log.info("[RefreshToken][Issue] token issued tokenId={} userId={} cid={}", 
            tokenId, user.getId(), cid);
        
        return new RefreshTokenPair(refreshJwt, authToken);
    }

    @Transactional
    public Optional<AuthToken> findActiveByToken(String rawToken) {
        String cid = CorrelationIdHolder.get();
        String tokenHash = hash(rawToken);
        
        Optional<AuthToken> tokenOpt = authTokenRepository.findByTokenHash(tokenHash);
        
        if (tokenOpt.isEmpty()) {
            log.warn("[RefreshToken][Validate] token not found reason=not_found cid={}", cid);
            return Optional.empty();
        }
        
        AuthToken token = tokenOpt.get();
        
        if (token.isRevoked()) {
            log.warn("[RefreshToken][Validate] token revoked tokenId={} userId={} reason=revoked cid={}", 
                token.getId(), token.getUser().getId(), cid);
            return Optional.empty();
        }
        
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("[RefreshToken][Validate] token expired tokenId={} userId={} expiresAt={} reason=expired cid={}", 
                token.getId(), token.getUser().getId(), token.getExpiresAt(), cid);
            return Optional.empty();
        }
        
        log.info("[RefreshToken][Validate] token valid tokenId={} userId={} reason=valid cid={}", 
            token.getId(), token.getUser().getId(), cid);
        return Optional.of(token);
    }

    @Transactional
    public void revoke(AuthToken token, boolean immediate) {
        if (token == null || token.isRevoked()) return;
        String cid = CorrelationIdHolder.get();
        UUID tokenId = token.getId();
        UUID userId = token.getUser().getId();
        
        token.setRevokedAt(LocalDateTime.now());
        authTokenRepository.save(token);
        
        log.info("[RefreshToken][Revoke] token revoked tokenId={} userId={} immediate={} cid={}", 
            tokenId, userId, immediate, cid);
        
        if (immediate) {
            if (tokenId != null) {
                authTokenRepository.deleteById(tokenId);
            }
        }
    }

    @Transactional
    public void revokeAllFor(User user) {
        String cid = CorrelationIdHolder.get();
        int count = authTokenRepository.findByUserAndRevokedAtIsNull(user).size();
        authTokenRepository.findByUserAndRevokedAtIsNull(user)
                .forEach(token -> revoke(token, true));
        log.info("[RefreshToken][Revoke] all tokens revoked for user userId={} count={} cid={}", 
            user.getId(), count, cid);
    }
    
    /**
     * Rotate a refresh token: revoke old, issue new.
     */
    @Transactional
    public RefreshTokenPair rotateRefresh(AuthToken oldToken, User user) {
        String cid = CorrelationIdHolder.get();
        UUID oldTokenId = oldToken.getId();
        
        // Revoke old token
        revoke(oldToken, false);
        
        // Issue new token
        RefreshTokenPair newPair = issue(user);
        
        log.info("[RefreshToken][Rotate] token rotated oldTokenId={} newTokenId={} userId={} cid={}", 
            oldTokenId, newPair.entity().getId(), user.getId(), cid);
        
        return newPair;
    }

    public record RefreshTokenPair(String refreshToken, AuthToken entity) {
    }
}


