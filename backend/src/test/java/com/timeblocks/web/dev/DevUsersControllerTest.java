package com.timeblocks.web.dev;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeblocks.model.User;
import com.timeblocks.model.UserRole;
import com.timeblocks.repo.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "dev"})
class DevUsersControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ObjectMapper objectMapper;

    @AfterEach
    void clean() {
        userRepository.deleteAll();
    }

    @Test
    void returnsUsersFromDevEndpoint() throws Exception {
        User user = new User();
        user.setEmail("dev@test.local");
        user.setPasswordHash("hash");
        user.setName("Dev User");
        user.setRole(UserRole.ADMIN);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        mockMvc.perform(get("/api/dev/users").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", hasItem("dev@test.local")))
                .andExpect(jsonPath("$[?(@.email=='dev@test.local')].role").value(hasItem("ADMIN")));
    }
}


