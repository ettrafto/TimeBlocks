package com.timeblocks.repo;

import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {
    Optional<AuthToken> findByTokenHash(String tokenHash);
    List<AuthToken> findByUserAndRevokedAtIsNull(User user);
    void deleteByUserAndExpiresAtBefore(User user, LocalDateTime cutoff);
}


