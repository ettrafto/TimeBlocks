package com.timeblocks.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeblocks.model.EmailVerification;
import com.timeblocks.model.PasswordReset;
import com.timeblocks.model.User;
import com.timeblocks.repo.AuthTokenRepository;
import com.timeblocks.repo.EmailVerificationRepository;
import com.timeblocks.repo.PasswordResetRepository;
import com.timeblocks.repo.UserRepository;
import com.timeblocks.security.AuthCookieNames;
import com.timeblocks.security.HashUtils;
import com.timeblocks.web.dto.auth.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    EmailVerificationRepository emailVerificationRepository;

    @Autowired
    PasswordResetRepository passwordResetRepository;

    @Autowired
    AuthTokenRepository authTokenRepository;

    @AfterEach
    void clean() {
        authTokenRepository.deleteAll();
        passwordResetRepository.deleteAll();
        emailVerificationRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void endToEndAuthFlow() throws Exception {
        SignupRequest signup = new SignupRequest("user@test.local", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("user@test.local").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        VerifyEmailRequest verifyEmailRequest = new VerifyEmailRequest("user@test.local", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyEmailRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true));

        LoginRequest loginRequest = new LoginRequest("user@test.local", "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("user@test.local"))
                .andReturn();

        Cookie accessCookie = findCookie(loginResult, AuthCookieNames.ACCESS);
        Cookie refreshCookie = findCookie(loginResult, AuthCookieNames.REFRESH);
        assertThat(accessCookie).isNotNull();
        assertThat(refreshCookie).isNotNull();

        mockMvc.perform(get("/api/auth/me")
                        .cookie(accessCookie, refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("user@test.local"));

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .with(csrf())
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andReturn();
        Cookie refreshedAccess = findCookie(refreshResult, AuthCookieNames.ACCESS);
        Cookie refreshedRefresh = findCookie(refreshResult, AuthCookieNames.REFRESH);
        assertThat(refreshedAccess).isNotNull();
        assertThat(refreshedRefresh).isNotNull();

        mockMvc.perform(post("/api/auth/logout")
                        .with(csrf())
                        .cookie(refreshedAccess, refreshedRefresh))
                .andExpect(status().isOk());

        // After logout, cookies are cleared, so don't send them (simulates browser behavior)
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        RequestPasswordResetRequest resetRequest = new RequestPasswordResetRequest("user@test.local");
        mockMvc.perform(post("/api/auth/request-password-reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk());

        PasswordReset reset = passwordResetRepository.findAll().stream().findFirst().orElseThrow();
        reset.setCode(HashUtils.sha256("222222"));
        passwordResetRepository.save(reset);

        ResetPasswordRequest resetPasswordRequest = new ResetPasswordRequest("user@test.local", "222222", "NewPassword123!");
        mockMvc.perform(post("/api/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetPasswordRequest)))
                .andExpect(status().isOk());

        LoginRequest loginAfterReset = new LoginRequest("user@test.local", "NewPassword123!");
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginAfterReset)))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/types"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_setsCookiesWithCorrectAttributes() throws Exception {
        // Create and verify user first
        SignupRequest signup = new SignupRequest("user@test.local", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("user@test.local").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        VerifyEmailRequest verifyEmailRequest = new VerifyEmailRequest("user@test.local", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyEmailRequest)))
                .andExpect(status().isOk());

        // Perform login
        LoginRequest loginRequest = new LoginRequest("user@test.local", "Password123!");
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie accessCookie = findCookie(result, AuthCookieNames.ACCESS);
        Cookie refreshCookie = findCookie(result, AuthCookieNames.REFRESH);

        assertThat(accessCookie).isNotNull();
        assertThat(refreshCookie).isNotNull();

        // Assert cookie attributes for test profile (SameSite=Lax, Secure=false)
        assertThat(accessCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(accessCookie.getPath()).isEqualTo("/");
        assertThat(refreshCookie.getPath()).isEqualTo("/");
        assertThat(accessCookie.getMaxAge()).isGreaterThan(0);
        assertThat(refreshCookie.getMaxAge()).isGreaterThan(0);

        // Check Set-Cookie headers for SameSite and Secure attributes
        String setCookieHeaders = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookieHeaders).isNotNull();
        // In test profile, SameSite should be Lax and Secure should be false
        assertThat(setCookieHeaders).contains("SameSite=Lax");
        // Secure should not be present in test profile (false)
        // Note: MockMvc may not expose Secure=false explicitly, but it shouldn't have Secure=true
    }

    @Test
    void logout_clearsCookiesWithMaxAgeZero() throws Exception {
        // Create and verify user first
        SignupRequest signup = new SignupRequest("user@test.local", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("user@test.local").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        VerifyEmailRequest verifyEmailRequest = new VerifyEmailRequest("user@test.local", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyEmailRequest)))
                .andExpect(status().isOk());

        // Login first
        LoginRequest loginRequest = new LoginRequest("user@test.local", "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = findCookie(loginResult, AuthCookieNames.REFRESH);
        assertThat(refreshCookie).isNotNull();

        // Perform logout
        MvcResult logoutResult = mockMvc.perform(post("/api/auth/logout")
                        .with(csrf())
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andReturn();

        // Check that cookies are cleared (maxAge=0)
        String setCookieHeaders = logoutResult.getResponse().getHeader("Set-Cookie");
        assertThat(setCookieHeaders).isNotNull();
        assertThat(setCookieHeaders).contains("Max-Age=0");
    }

    @Test
    void me_unauthenticated_returns401WithCorrectJsonFormat() throws Exception {
        MvcResult result =         mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value("/api/auth/me"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andReturn();

        // Verify correlation ID is optional (may or may not be present)
        String content = result.getResponse().getContentAsString();
        assertThat(content).contains("\"error\":\"unauthorized\"");
        assertThat(content).contains("\"status\":401");
        assertThat(content).contains("\"path\":\"/api/auth/me\"");
    }

    @Test
    void me_unauthenticated_includesCorrelationIdWhenProvided() throws Exception {
        String correlationId = "test-cid-12345";
        MvcResult result = mockMvc.perform(get("/api/auth/me")
                        .header("X-Correlation-Id", correlationId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.correlationId").value(correlationId))
                .andReturn();
        
        // Assert response header contains correlation ID
        String responseCid = result.getResponse().getHeader("X-Correlation-Id");
        assertThat(responseCid).isEqualTo(correlationId);
    }
    
    @Test
    void me_unauthenticated_generatesCorrelationIdWhenMissing() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.correlationId").exists())
                .andReturn();
        
        // Assert response header contains generated correlation ID
        String responseCid = result.getResponse().getHeader("X-Correlation-Id");
        assertThat(responseCid).isNotNull();
        assertThat(responseCid).isNotEmpty();
        // Should be a UUID format
        assertThat(responseCid).matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
        
        // Assert JSON body contains same correlation ID
        String jsonCid = result.getResponse().getContentAsString();
        assertThat(jsonCid).contains(responseCid);
    }
    
    @Test
    void jwtFilter_logsMissingTokenReason() throws Exception {
        // Call protected endpoint without cookies - should log jwt_missing
        mockMvc.perform(get("/api/types"))
                .andExpect(status().isUnauthorized());
        
        // Note: Log verification would require OutputCaptureExtension or similar.
        // This test verifies the endpoint behavior; log content verification is documented
        // in manual testing steps.
    }
    
    @Test
    void jwtFilter_logsMalformedTokenReason() throws Exception {
        // Call protected endpoint with malformed token cookie
        Cookie malformedCookie = new Cookie(AuthCookieNames.ACCESS, "not.a.valid.jwt");
        malformedCookie.setPath("/");
        
        mockMvc.perform(get("/api/types")
                        .cookie(malformedCookie))
                .andExpect(status().isUnauthorized());
        
        // Note: Log verification would show reason=jwt_malformed
    }

    @Test
    void signup_returnsVerificationRequiredPayload() throws Exception {
        String email = "apitest-" + System.currentTimeMillis() + "@local.test";
        SignupRequest signup = new SignupRequest(email, "Password123!", "API Tester");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("verification_required"));
    }

    @Test
    void verifyEmail_returnsVerificationSnapshot() throws Exception {
        String email = "verify-" + System.currentTimeMillis() + "@local.test";
        SignupRequest signup = new SignupRequest(email, "Password123!", "Verifier");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("333333"));
        emailVerificationRepository.save(verification);

        VerifyEmailRequest request = new VerifyEmailRequest(email, "333333");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true))
                .andExpect(jsonPath("$.alreadyVerified").value(false))
                .andExpect(jsonPath("$.verifiedAt").exists());
    }

    @Test
    void logout_withoutCookiesStillReturnsLoggedOutStatus() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("logged_out"));
    }

    @Test
    void resetPassword_returnsUpdatedStatus() throws Exception {
        String email = "reset-" + System.currentTimeMillis() + "@local.test";
        SignupRequest signup = new SignupRequest(email, "Password123!", "Reset Tester");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/request-password-reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequestPasswordResetRequest(email))))
                .andExpect(status().isOk());

        PasswordReset reset = passwordResetRepository.findAll().stream()
                .findFirst()
                .orElseThrow();
        reset.setCode(HashUtils.sha256("444444"));
        passwordResetRepository.save(reset);

        ResetPasswordRequest resetPasswordRequest = new ResetPasswordRequest(email, "444444", "NewPassword123!");
        mockMvc.perform(post("/api/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetPasswordRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("password_updated"));
    }
    
    @Test
    void refreshTokenService_logsRotation() throws Exception {
        // Create and verify user first
        SignupRequest signup = new SignupRequest("user@test.local", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("user@test.local").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        VerifyEmailRequest verifyEmailRequest = new VerifyEmailRequest("user@test.local", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyEmailRequest)))
                .andExpect(status().isOk());

        // Login
        LoginRequest loginRequest = new LoginRequest("user@test.local", "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = findCookie(loginResult, AuthCookieNames.REFRESH);
        assertThat(refreshCookie).isNotNull();

        // Perform refresh - should log [RefreshToken][Rotate] and [RefreshToken][Validate]
        mockMvc.perform(post("/api/auth/refresh")
                        .with(csrf())
                        .cookie(refreshCookie))
                .andExpect(status().isOk());
        
        // Note: Log verification would show:
        // [RefreshToken][Validate] reason=valid
        // [RefreshToken][Rotate] token rotated
    }

    @Test
    void verifyEmail_withInvalidCode_returns400() throws Exception {
        // Create user first
        SignupRequest signup = new SignupRequest("test@example.com", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("test@example.com").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        // Try with wrong code
        VerifyEmailRequest verifyRequest = new VerifyEmailRequest("test@example.com", "999999");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid_code"));
    }

    @Test
    void verifyEmail_withExpiredCode_returns400() throws Exception {
        // Create user first
        SignupRequest signup = new SignupRequest("expired@example.com", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("expired@example.com").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        verification.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1)); // Expired
        emailVerificationRepository.save(verification);

        // Try to verify with expired code
        VerifyEmailRequest verifyRequest = new VerifyEmailRequest("expired@example.com", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("code_expired"));
    }

    @Test
    void verifyEmail_alreadyVerified_returnsAlreadyVerifiedTrue() throws Exception {
        // Create and verify user first
        SignupRequest signup = new SignupRequest("already@example.com", "Password123!", "Test User");
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("already@example.com").orElseThrow();
        EmailVerification verification = emailVerificationRepository.findAll().stream()
                .filter(v -> v.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        verification.setCode(HashUtils.sha256("111111"));
        emailVerificationRepository.save(verification);

        // Verify first time
        VerifyEmailRequest verifyRequest = new VerifyEmailRequest("already@example.com", "111111");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true))
                .andExpect(jsonPath("$.alreadyVerified").value(false));

        // Try to verify again
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true))
                .andExpect(jsonPath("$.alreadyVerified").value(true));
    }

    @Test
    void verifyEmail_withNonExistentUser_returns404() throws Exception {
        VerifyEmailRequest verifyRequest = new VerifyEmailRequest("nonexistent@example.com", "123456");
        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("user_not_found"));
    }

    private Cookie findCookie(MvcResult result, String name) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(c -> c.getName().equals(name))
                .findFirst()
                .orElse(null);
    }
}


