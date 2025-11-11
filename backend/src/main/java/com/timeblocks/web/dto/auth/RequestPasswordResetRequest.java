package com.timeblocks.web.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RequestPasswordResetRequest(
        @Email @NotBlank String email
) {}


