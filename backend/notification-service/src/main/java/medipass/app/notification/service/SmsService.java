package medipass.app.notification.service;

import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.exception.NotificationSendFailureException;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsService {

    public void sendSms(String toPhone, String message) {
        log.info("Sending SMS to={} message=\"{}\"", toPhone, message);
        try {
            // Simulate gateway transmission
            Thread.sleep(100); 
            log.info("SMS successfully sent to={}", toPhone);
        } catch (Exception ex) {
            log.error("Failed to send SMS to={}: {}", toPhone, ex.getMessage());
            throw new NotificationSendFailureException("Failed to send SMS: " + ex.getMessage(), ex);
        }
    }
}
