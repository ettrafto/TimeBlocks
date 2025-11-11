package com.timeblocks.config;

import com.timeblocks.model.User;
import com.timeblocks.model.UserRole;
import com.timeblocks.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
        prefix = "app.seed-admin",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class DevAdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedEmail;
    private final String seedPassword;

    public DevAdminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed-admin.email:admin@local.test}") String seedEmail,
            @Value("${app.seed-admin.password:Admin123!}") String seedPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedEmail = seedEmail.toLowerCase(Locale.ROOT);
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        userRepository.findByEmail(seedEmail).ifPresentOrElse(existing -> {
            existing.setEmail(seedEmail);
            existing.setRole(UserRole.ADMIN);
            existing.setName(existing.getName() == null || existing.getName().isBlank() ? "Admin" : existing.getName());
            existing.setPasswordHash(passwordEncoder.encode(seedPassword));
            if (existing.getEmailVerifiedAt() == null) {
                existing.setEmailVerifiedAt(java.time.LocalDateTime.now());
            }
            userRepository.saveAndFlush(existing);
            log.info("[DevAdminSeeder] Refreshed development admin account {} with password {}", seedEmail, seedPassword);
        }, () -> {
            User admin = new User();
            admin.setEmail(seedEmail);
            admin.setName("Admin");
            admin.setRole(UserRole.ADMIN);
            admin.setPasswordHash(passwordEncoder.encode(seedPassword));
            admin.setEmailVerifiedAt(java.time.LocalDateTime.now());
            userRepository.saveAndFlush(admin);
            log.info("[DevAdminSeeder] Seeded development admin account {} with password {}", seedEmail, seedPassword);
        });
        userRepository.findByEmail(seedEmail).ifPresent(user -> {
            log.info("[DevAdminSeeder] state => email={} role={} verifiedAt={} createdAt={} updatedAt={}",
                    user.getEmail(), user.getRole(), user.getEmailVerifiedAt(),
                    user.getCreatedAt(), user.getUpdatedAt());
        });
    }
}


