package medipass.app.audit;

import medipass.app.config.OpenApiConfig;
import medipass.app.config.RabbitMQConfig;
import medipass.app.config.SecurityConfig;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"medipass.app.audit", "medipass.app.consumer", "medipass.common"})
@EntityScan(basePackages = "medipass.app.audit.entity")
@EnableJpaRepositories(basePackages = "medipass.app.audit.repository")
@EnableJpaAuditing
@EnableRabbit
@Import({SecurityConfig.class, OpenApiConfig.class, RabbitMQConfig.class})
public class AuditServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuditServiceApplication.class, args);
    }
}
