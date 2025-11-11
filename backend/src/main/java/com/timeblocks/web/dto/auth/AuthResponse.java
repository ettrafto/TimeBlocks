package com.timeblocks.web.dto.auth;

public record AuthResponse(UserResponse user) {
    public static AuthResponse of(UserResponse userResponse) {
        return new AuthResponse(userResponse);
    }
}


