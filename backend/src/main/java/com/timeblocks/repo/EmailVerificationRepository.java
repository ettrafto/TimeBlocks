package com.timeblocks.repo;

import com.timeblocks.model.EmailVerification;
import com.timeblocks.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {
    Optional<EmailVerification> findFirstByUserAndCodeAndUsedAtIsNull(User user, String code);
    void deleteByUserAndExpiresAtBefore(User user, LocalDateTime cutoff);
}


