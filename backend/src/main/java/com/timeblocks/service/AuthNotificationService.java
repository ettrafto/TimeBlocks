package com.timeblocks.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthNotificationService {

    private static final Logger log = LoggerFactory.getLogger(AuthNotificationService.class);

    private final boolean logCodes;

    public AuthNotificationService(@Value("${auth.notifications.log-codes:true}") boolean logCodes) {
        this.logCodes = logCodes;
    }

    public void sendEmailVerification(String email, String code) {
        if (logCodes) {
            log.info("Email verification for {} -> {}", email, code);
        }
        // Placeholder: integrate real email provider here.
    }

    public void sendPasswordReset(String email, String code) {
        if (logCodes) {
            log.info("Password reset for {} -> {}", email, code);
        }
    }
}


