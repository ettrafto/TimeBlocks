package com.timeblocks.web.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 4, max = 64) String code
) {}


