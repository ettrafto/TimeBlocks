package com.timeblocks.web.dev;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeblocks.model.User;
import com.timeblocks.model.UserRole;
import com.timeblocks.repo.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "dev"})
class DevUsersControllerIntegrationTest {

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
    void listsUsersWithNonSensitiveData() throws Exception {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("dev-monitor@test.local");
        user.setPasswordHash("hash");
        user.setName("Dev Monitor");
        user.setRole(UserRole.USER);
        user.setCreatedAt(LocalDateTime.now().minusDays(2));
        user.setUpdatedAt(LocalDateTime.now().minusDays(1));
        userRepository.save(user);

        String json = mockMvc.perform(get("/api/dev/users"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode array = objectMapper.readTree(json);
        assertThat(array.isArray()).isTrue();
        assertThat(array.size()).isGreaterThanOrEqualTo(1);

        JsonNode first = array.get(0);
        assertThat(first.has("email")).isTrue();
        assertThat(first.has("passwordHash")).isFalse();
    }
}


