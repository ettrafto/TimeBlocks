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

        mockMvc.perform(get("/api/auth/me")
                        .cookie(refreshedAccess))
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

    private Cookie findCookie(MvcResult result, String name) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(c -> c.getName().equals(name))
                .findFirst()
                .orElse(null);
    }
}


