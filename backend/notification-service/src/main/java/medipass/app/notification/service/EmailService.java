package medipass.app.notification.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.exception.NotificationSendFailureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@medipass.com}")
    private String fromEmail;

    public void sendEmail(String to, String subject, String body) {
        log.info("Sending Email to={} subject=\"{}\"", to, subject);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true); // true sets HTML support!
            helper.setFrom(fromEmail);

            mailSender.send(message);
            log.info("Email successfully sent to={}", to);
        } catch (Exception ex) {
            log.error("Failed to send email to={}: {}", to, ex.getMessage(), ex);
            throw new NotificationSendFailureException("Failed to send email: " + ex.getMessage(), ex);
        }
    }
}
