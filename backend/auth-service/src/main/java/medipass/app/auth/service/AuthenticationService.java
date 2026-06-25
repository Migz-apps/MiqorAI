package medipass.app.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.auth.dto.LoginResponse;
import medipass.app.auth.dto.RegisterRequest;
import medipass.app.auth.dto.TokenValidationResponse;
import medipass.app.auth.entity.RefreshToken;
import medipass.app.auth.entity.User;
import medipass.app.auth.exception.AccountDisabledException;
import medipass.app.auth.exception.InvalidCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

    private final UserService userService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void register(RegisterRequest request) {
        userService.createUser(request.getPhoneNumber(), request.getPassword(), request.getRole());
        log.info("User registered with phone={}", maskPhone(request.getPhoneNumber()));
    }

    @Transactional
    public LoginResponse login(String phoneNumber, String rawPassword) {
        log.info("Login attempt for phone={}", maskPhone(phoneNumber));

        User user = userService.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> {
                    log.warn("Failed login - user not found for phone={}", maskPhone(phoneNumber));
                    return new InvalidCredentialsException("Invalid phone number or password");
                });

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            log.warn("Failed login - account disabled for userId={}", user.getId());
            throw new AccountDisabledException("Account is disabled");
        }

        if (!validateCredentials(rawPassword, user.getPasswordHash())) {
            log.warn("Failed login - invalid password for userId={}", user.getId());
            throw new InvalidCredentialsException("Invalid phone number or password");
        }

        String accessToken = jwtService.generateAccessToken(user.getPhoneNumber(), user.getRole().name());
        String refreshTokenStr = jwtService.generateRefreshToken(user.getPhoneNumber());

        LocalDateTime accessExpiresAt = LocalDateTime.now()
                .plusSeconds(jwtService.getAccessExpirationMs() / 1000);
        LocalDateTime refreshExpiresAt = LocalDateTime.now()
                .plusSeconds(jwtService.getRefreshExpirationMs() / 1000);

        sessionService.createSession(user.getId(), accessToken, accessExpiresAt);
        refreshTokenService.createRefreshToken(user.getId(), refreshTokenStr, refreshExpiresAt);

        log.info("Login successful for userId={}", user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .expiresAt(accessExpiresAt)
                .build();
    }

    @Transactional
    public LoginResponse refreshToken(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenService.validateRefreshToken(refreshTokenStr);

        User user = userService.findById(refreshToken.getUserId())
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AccountDisabledException("Account is disabled");
        }

        // Revoke old refresh token (rotation)
        refreshTokenService.revokeRefreshToken(refreshTokenStr);

        String newAccessToken = jwtService.generateAccessToken(user.getPhoneNumber(), user.getRole().name());
        String newRefreshToken = jwtService.generateRefreshToken(user.getPhoneNumber());

        LocalDateTime accessExpiresAt = LocalDateTime.now()
                .plusSeconds(jwtService.getAccessExpirationMs() / 1000);
        LocalDateTime refreshExpiresAt = LocalDateTime.now()
                .plusSeconds(jwtService.getRefreshExpirationMs() / 1000);

        sessionService.createSession(user.getId(), newAccessToken, accessExpiresAt);
        refreshTokenService.createRefreshToken(user.getId(), newRefreshToken, refreshExpiresAt);

        log.info("Token refreshed for userId={}", user.getId());

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresAt(accessExpiresAt)
                .build();
    }

    @Transactional
    public void logout(String accessToken) {
        sessionService.revokeSession(accessToken);
        log.info("Logout - session revoked");
    }

    public TokenValidationResponse validateToken(String token) {
        try {
            jwtService.validateToken(token);

            if (sessionService.isTokenBlacklisted(token)) {
                return TokenValidationResponse.builder()
                        .valid(false)
                        .build();
            }

            String username = jwtService.extractUsername(token);
            String role = jwtService.extractRole(token);

            return TokenValidationResponse.builder()
                    .valid(true)
                    .username(username)
                    .role(role)
                    .build();
        } catch (Exception ex) {
            log.warn("Token validation failed: {}", ex.getMessage());
            return TokenValidationResponse.builder()
                    .valid(false)
                    .build();
        }
    }

    public boolean validateCredentials(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return phone.substring(0, phone.length() - 4) + "****";
    }
}
