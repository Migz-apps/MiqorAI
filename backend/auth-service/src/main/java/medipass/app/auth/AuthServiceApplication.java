package medipass.app.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import medipass.app.config.OpenApiConfig;
import medipass.app.config.RedisConfig;
import medipass.app.config.SecurityConfig;

@SpringBootApplication(scanBasePackages = {"medipass.app.auth", "medipass.common"})
@EntityScan(basePackages = "medipass.app.auth.entity")
@EnableJpaRepositories(basePackages = "medipass.app.auth.repository")
@EnableJpaAuditing
@Import({SecurityConfig.class, RedisConfig.class, OpenApiConfig.class})
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
