package medipass.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenServiceTest {

    private static final String SECRET = "medipass-test-secret-key-minimum-32-characters";

    private JwtTokenService jwtTokenService;

    @BeforeEach
    void setUp() {
        jwtTokenService = new JwtTokenService();
        ReflectionTestUtils.setField(jwtTokenService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtTokenService, "accessExpiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtTokenService, "refreshExpiration", 604_800_000L);
    }

    @Test
    void generateAccessToken_extractsUsernameAndRole() {
        String token = jwtTokenService.generateAccessToken("+250788123456", "ADMIN");

        jwtTokenService.validateToken(token);
        assertThat(jwtTokenService.extractUsername(token)).isEqualTo("+250788123456");
        assertThat(jwtTokenService.extractRole(token)).isEqualTo("ADMIN");
    }

    @Test
    void generateRefreshToken_hasNoRole() {
        String token = jwtTokenService.generateRefreshToken("+250788123456");

        jwtTokenService.validateToken(token);
        assertThat(jwtTokenService.extractUsername(token)).isEqualTo("+250788123456");
        assertThat(jwtTokenService.extractRole(token)).isNull();
    }

    @Test
    void validateToken_rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtTokenService.validateToken("not-a-jwt"))
                .isInstanceOf(JwtValidationException.class);
    }
}
