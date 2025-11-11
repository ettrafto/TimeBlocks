package com.timeblocks.security;

import com.timeblocks.model.User;
import com.timeblocks.repo.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import java.io.IOException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            Cookie cookie = WebUtils.getCookie(request, AuthCookieNames.ACCESS);
            if (cookie != null) {
                authenticateWithToken(cookie.getValue(), request);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateWithToken(String token, HttpServletRequest request) {
        try {
            Jws<Claims> parsed = jwtService.parseAccessToken(token);
            String subject = parsed.getPayload().getSubject();
            if (subject == null) {
                return;
            }
            UUID userId = UUID.fromString(subject);
            Optional<User> userOptional = userRepository.findById(Objects.requireNonNull(userId));
            if (userOptional.isEmpty()) {
                return;
            }
            User user = userOptional.get();
            AppUserDetails principal = new AppUserDetails(user);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ex) {
            log.debug("Failed to authenticate via JWT: {}", ex.getMessage());
        }
    }
}


