package medipass.app.config;

import medipass.common.config.ResourceServerSecurityConfig;
import medipass.common.security.JwtTokenService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

@Configuration
@ConditionalOnProperty(name = "medipass.security.resource-server", havingValue = "true")
public class SecurityConfig extends ResourceServerSecurityConfig {

    public SecurityConfig(JwtTokenService jwtTokenService) {
        super(jwtTokenService);
    }

    @Override
    protected void configureAuthorization(
            org.springframework.security.config.annotation.web.configurers
                    .AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
        auth.requestMatchers("/api/v1/audit/**").hasRole("ADMIN")
                .anyRequest().authenticated();
    }
}
