package com.timeblocks.security;

import com.timeblocks.config.AuthProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtService {

    private final AuthProperties properties;
    private SecretKey accessKey;
    private SecretKey refreshKey;

    public JwtService(AuthProperties properties) {
        this.properties = properties;
    }

    private SecretKey accessKey() {
        if (accessKey == null) {
            accessKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(ensureBase64(properties.getAccessSecret())));
        }
        return accessKey;
    }

    private SecretKey refreshKey() {
        if (refreshKey == null) {
            refreshKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(ensureBase64(properties.getRefreshSecret())));
        }
        return refreshKey;
    }

    private String ensureBase64(String secret) {
        // Allow providing plain text secret by encoding when length < 32 bytes
        if (secret == null || secret.isBlank()) {
            secret = UUID.randomUUID().toString().replace("-", "");
        }
        byte[] decoded = decodeMaybe(secret);
        if (decoded.length < 64) {
            return strengthen(decoded);
        }
        return io.jsonwebtoken.io.Encoders.BASE64.encode(decoded);
    }

    private String strengthen(byte[] seed) {
        try {
            MessageDigest sha512 = MessageDigest.getInstance("SHA-512");
            byte[] derived = sha512.digest(seed);
            return io.jsonwebtoken.io.Encoders.BASE64.encode(derived);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 not available", e);
        }
    }

    private byte[] decodeMaybe(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (IllegalArgumentException ex) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }

    private Date now() {
        return Date.from(Instant.now());
    }

    private Date plusMinutes(long minutes) {
        return Date.from(Instant.now().plusSeconds(minutes * 60));
    }

    private Date plusDays(long days) {
        return Date.from(Instant.now().plusSeconds(days * 24 * 3600));
    }

    public String generateAccessToken(UUID userId, Map<String, Object> claims) {
        return Jwts.builder()
                .subject(userId.toString())
                .claims(claims)
                .issuedAt(now())
                .expiration(plusMinutes(properties.getAccessTtlMinutes()))
                .signWith(accessKey(), Jwts.SIG.HS512)
                .compact();
    }

    public String generateRefreshToken(UUID tokenId, UUID userId) {
        return Jwts.builder()
                .id(tokenId.toString())
                .subject(userId.toString())
                .issuedAt(now())
                .expiration(plusDays(properties.getRefreshTtlDays()))
                .signWith(refreshKey(), Jwts.SIG.HS512)
                .compact();
    }

    public Jws<Claims> parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(accessKey())
                .build()
                .parseSignedClaims(token);
    }

    public Jws<Claims> parseRefreshToken(String token) {
        return Jwts.parser()
                .verifyWith(refreshKey())
                .build()
                .parseSignedClaims(token);
    }

    public static LocalDateTime toLocalDateTime(Date date) {
        return LocalDateTime.ofInstant(date.toInstant(), ZoneOffset.UTC);
    }
}


