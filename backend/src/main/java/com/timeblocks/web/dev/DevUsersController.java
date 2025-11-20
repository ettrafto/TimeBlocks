package com.timeblocks.web.dev;

import com.timeblocks.model.AuthToken;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import com.timeblocks.repo.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Profile("dev")
@RestController
@RequestMapping("/api/dev")
public class DevUsersController {

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;

    public DevUsersController(UserRepository userRepository, AuthTokenRepository authTokenRepository) {
        this.userRepository = userRepository;
        this.authTokenRepository = authTokenRepository;
    }

    @GetMapping("/users")
    public List<DevUserResponse> listUsers() {
        LocalDateTime now = LocalDateTime.now();
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"))
                .stream()
                .map(user -> mapUser(user, now))
                .toList();
    }

    private DevUserResponse mapUser(User user, LocalDateTime now) {
        List<AuthToken> activeTokens = authTokenRepository.findByUserAndRevokedAtIsNull(user)
                .stream()
                .filter(token -> token.getExpiresAt() != null && token.getExpiresAt().isAfter(now))
                .toList();

        boolean authenticated = !activeTokens.isEmpty();
        LocalDateTime lastLoginAt = activeTokens.stream()
                .map(AuthToken::getCreatedAt)
                .max(Comparator.naturalOrder())
                .orElse(null);
        boolean loggedInRecently = lastLoginAt != null && lastLoginAt.isAfter(now.minusDays(1));

        String role = user.getRole() != null ? user.getRole().name() : "UNKNOWN";
        boolean verified = user.getEmailVerifiedAt() != null;
        boolean active = user.getUpdatedAt() != null;

        return new DevUserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                role,
                verified,
                active,
                authenticated,
                loggedInRecently,
                user.getEmailVerifiedAt(),
                lastLoginAt,
                user.getCreatedAt(),
                user.getUpdatedAt(),
                activeTokens.size()
        );
    }

    public record DevUserResponse(
            UUID id,
            String email,
            String name,
            String role,
            boolean verified,
            boolean active,
            boolean authenticated,
            boolean loggedInRecently,
            LocalDateTime verifiedAt,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int activeSessionCount
    ) {
    }
}


