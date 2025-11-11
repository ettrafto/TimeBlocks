package com.timeblocks.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterServiceTest {

    @Test
    void respectsWindowLimit() {
        RateLimiterService limiter = new RateLimiterService(1000, 2);
        assertThat(limiter.tryConsume("ip")).isTrue();
        assertThat(limiter.tryConsume("ip")).isTrue();
        assertThat(limiter.tryConsume("ip")).isFalse();
    }
}


