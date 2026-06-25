package medipass.app.auth.service;

import medipass.app.auth.dto.LoginResponse;
import medipass.app.auth.dto.RegisterRequest;
import medipass.app.auth.entity.RefreshToken;
import medipass.app.auth.entity.User;
import medipass.app.auth.exception.AccountDisabledException;
import medipass.app.auth.exception.InvalidCredentialsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserService userService;
    @Mock
    private JwtService jwtService;
    @Mock
    private SessionService sessionService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void login_returnsTokensForValidCredentials() {
        User user = User.builder()
                .id(java.util.UUID.randomUUID())
                .phoneNumber("+250788123456")
                .passwordHash("hash")
                .role(medipass.app.auth.entity.Role.PATIENT)
                .isActive(true)
                .build();

        when(userService.findByPhoneNumber("+250788123456")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "hash")).thenReturn(true);
        when(jwtService.generateAccessToken("+250788123456", "PATIENT")).thenReturn("access-token");
        when(jwtService.generateRefreshToken("+250788123456")).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationMs()).thenReturn(3_600_000L);
        when(jwtService.getRefreshExpirationMs()).thenReturn(604_800_000L);

        LoginResponse response = authenticationService.login("+250788123456", "password");

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        verify(sessionService).createSession(any(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void login_throwsWhenAccountDisabled() {
        User user = User.builder()
                .phoneNumber("+250788123456")
                .passwordHash("hash")
                .isActive(false)
                .build();
        when(userService.findByPhoneNumber("+250788123456")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authenticationService.login("+250788123456", "password"))
                .isInstanceOf(AccountDisabledException.class);
    }

    @Test
    void register_delegatesToUserService() {
        RegisterRequest request = new RegisterRequest();
        request.setPhoneNumber("+250788123456");
        request.setPassword("password");
        request.setRole(medipass.app.auth.entity.Role.PATIENT);

        authenticationService.register(request);

        verify(userService).createUser("+250788123456", "password", medipass.app.auth.entity.Role.PATIENT);
    }
}
