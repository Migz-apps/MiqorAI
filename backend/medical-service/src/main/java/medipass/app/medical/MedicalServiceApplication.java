package medipass.app.medical;

import medipass.app.config.OpenApiConfig;
import medipass.app.config.RabbitMQConfig;
import medipass.app.config.SecurityConfig;
import medipass.app.integration.config.IntegrationConfig;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"medipass.app.medical", "medipass.app.integration", "medipass.common"})
@EntityScan(basePackages = "medipass.app.medical.entity")
@EnableJpaRepositories(basePackages = "medipass.app.medical.repository")
@EnableJpaAuditing
@EnableRabbit
@Import({SecurityConfig.class, OpenApiConfig.class, RabbitMQConfig.class, IntegrationConfig.class})
public class MedicalServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedicalServiceApplication.class, args);
    }
}
