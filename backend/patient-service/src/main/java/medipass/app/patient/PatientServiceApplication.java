package medipass.app.patient;

import medipass.app.config.OpenApiConfig;
import medipass.app.config.SecurityConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"medipass.app.patient", "medipass.common"})
@EntityScan(basePackages = "medipass.app.patient.entity")
@EnableJpaRepositories(basePackages = "medipass.app.patient.repository")
@EnableJpaAuditing
@Import({SecurityConfig.class, OpenApiConfig.class})
public class PatientServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PatientServiceApplication.class, args);
    }
}
