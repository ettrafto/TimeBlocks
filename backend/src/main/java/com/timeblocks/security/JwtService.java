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
            byte[] keyBytes = ensureKeyBytes(properties.getAccessSecret());
            accessKey = Keys.hmacShaKeyFor(keyBytes);
        }
        return accessKey;
    }

    private SecretKey refreshKey() {
        if (refreshKey == null) {
            byte[] keyBytes = ensureKeyBytes(properties.getRefreshSecret());
            refreshKey = Keys.hmacShaKeyFor(keyBytes);
        }
        return refreshKey;
    }

    /**
     * Ensures we have at least 64 bytes of key material for HMAC-SHA512.
     * The secret from config may be:
     * 1. URL-safe Base64 encoded (uses - and _)
     * 2. Standard Base64 encoded (uses + and /)
     * 3. Plain text (not Base64 at all)
     * 
     * Returns raw bytes (not Base64-encoded) ready for Keys.hmacShaKeyFor().
     */
    private byte[] ensureKeyBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            secret = UUID.randomUUID().toString().replace("-", "");
        }
        byte[] decoded = decodeMaybe(secret);
        if (decoded.length < 64) {
            return strengthen(decoded);
        }
        return decoded;
    }

    private byte[] strengthen(byte[] seed) {
        try {
            MessageDigest sha512 = MessageDigest.getInstance("SHA-512");
            return sha512.digest(seed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 not available", e);
        }
    }

    /**
     * Attempts to decode a secret string that may be:
     * 1. URL-safe Base64 encoded (uses - and _)
     * 2. Standard Base64 encoded (uses + and /)
     * 3. Plain text (not Base64 at all)
     * 
     * Tries URL-safe first (since JWT uses URL-safe Base64), then standard, then treats as UTF-8.
     * 
     * @throws IllegalStateException if there's an unexpected error during decoding
     */
    private byte[] decodeMaybe(String secret) {
        if (secret == null || secret.isBlank()) {
            return new byte[0];
        }
        
        // Try URL-safe Base64 first (JWT standard)
        try {
            return Decoders.BASE64URL.decode(secret);
        } catch (IllegalArgumentException | io.jsonwebtoken.io.DecodingException e) {
            // Not URL-safe Base64, try standard Base64
            try {
                return Decoders.BASE64.decode(secret);
            } catch (IllegalArgumentException | io.jsonwebtoken.io.DecodingException e2) {
                // Not Base64 at all, treat as plain UTF-8 string
                // This is the expected path for plain text secrets like "dev-access-secret"
                return secret.getBytes(StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            // Catch any other unexpected exceptions during decoding
            throw new IllegalStateException("Failed to decode secret: " + e.getMessage(), e);
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


