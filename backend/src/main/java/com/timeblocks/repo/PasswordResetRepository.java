package com.timeblocks.repo;

import com.timeblocks.model.PasswordReset;
import com.timeblocks.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, UUID> {
    Optional<PasswordReset> findFirstByUserAndCodeAndUsedAtIsNull(User user, String code);
    void deleteByUserAndExpiresAtBefore(User user, LocalDateTime cutoff);
}


