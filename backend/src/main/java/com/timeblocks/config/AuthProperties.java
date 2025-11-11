package com.timeblocks.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "auth")
public class AuthProperties {

    /**
     * Secret used to sign access JWTs.
     */
    private String accessSecret = "change-me-access";

    /**
     * Secret used to sign refresh JWTs.
     */
    private String refreshSecret = "change-me-refresh";

    /**
     * Access token time-to-live in minutes.
     */
    private long accessTtlMinutes = 15;

    /**
     * Refresh token time-to-live in days.
     */
    private long refreshTtlDays = 30;

    /**
     * Domain for cookies (optional).
     */
    private String cookieDomain = "";

    /**
     * Whether to mark cookies as secure.
     */
    private boolean cookieSecure = false;

    /**
     * SameSite attribute (Lax, Strict, None).
     */
    private String cookieSameSite = "Lax";

    public String getAccessSecret() {
        return accessSecret;
    }

    public void setAccessSecret(String accessSecret) {
        this.accessSecret = accessSecret;
    }

    public String getRefreshSecret() {
        return refreshSecret;
    }

    public void setRefreshSecret(String refreshSecret) {
        this.refreshSecret = refreshSecret;
    }

    public long getAccessTtlMinutes() {
        return accessTtlMinutes;
    }

    public void setAccessTtlMinutes(long accessTtlMinutes) {
        this.accessTtlMinutes = accessTtlMinutes;
    }

    public long getRefreshTtlDays() {
        return refreshTtlDays;
    }

    public void setRefreshTtlDays(long refreshTtlDays) {
        this.refreshTtlDays = refreshTtlDays;
    }

    public String getCookieDomain() {
        return cookieDomain;
    }

    public void setCookieDomain(String cookieDomain) {
        this.cookieDomain = cookieDomain;
    }

    public boolean isCookieSecure() {
        return cookieSecure;
    }

    public void setCookieSecure(boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }

    public String getCookieSameSite() {
        return cookieSameSite;
    }

    public void setCookieSameSite(String cookieSameSite) {
        this.cookieSameSite = cookieSameSite;
    }
}


