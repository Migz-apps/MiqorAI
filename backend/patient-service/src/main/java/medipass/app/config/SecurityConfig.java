package medipass.app.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import medipass.common.config.ResourceServerSecurityConfig;

@Configuration
@ConditionalOnProperty(name = "medipass.security.resource-server", havingValue = "true")
@Import(ResourceServerSecurityConfig.class)
public class SecurityConfig {
}
