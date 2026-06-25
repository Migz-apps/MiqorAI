package medipass.app.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.entity.*;
import medipass.app.notification.event.InboundEvent;
import medipass.app.notification.exception.DeliveryRetryLimitExceededException;
import medipass.app.notification.exception.TemplateNotFoundException;
import medipass.app.notification.repository.DeliveryLogRepository;
import medipass.app.notification.repository.NotificationRepository;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final DeliveryLogRepository deliveryLogRepository;
    private final TemplateService templateService;
    private final EmailService emailService;
    private final SmsService smsService;

    @Value("${notification.max-retries:3}")
    private int maxRetries;

    @Transactional
    public void processEvent(InboundEvent event) {
        String correlationId = event.getCorrelationId() != null ? event.getCorrelationId() : UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        try {
            log.info("Processing notification eventId={} eventType={} service={}", event.getEventId(), event.getEventType(), event.getServiceName());

            Map<String, Object> payload = event.getPayload();
            if (payload == null) {
                log.warn("Empty payload for event type={}. Notification ignored.", event.getEventType());
                return;
            }

            // Extract contact details from the event payload
            String email = getPayloadValue(payload, "email", "patientEmail", "recipientEmail", "doctorEmail");
            String phone = getPayloadValue(payload, "phone", "patientPhone", "recipientPhone", "doctorPhone", "mobile");

            boolean processed = false;

            // 1. Process Email channel
            try {
                String formattedEmail = templateService.formatMessage(event.getEventType(), NotificationChannel.EMAIL, payload);
                String subject = templateService.getSubject(event.getEventType(), NotificationChannel.EMAIL);
                if (email != null && !email.isBlank()) {
                    createAndSend(event, NotificationChannel.EMAIL, email, subject, formattedEmail, correlationId);
                    processed = true;
                }
            } catch (TemplateNotFoundException ex) {
                log.debug("No active email template found for eventType={}. Skipping email dispatch.", event.getEventType());
            }

            // 2. Process SMS channel
            try {
                String formattedSms = templateService.formatMessage(event.getEventType(), NotificationChannel.SMS, payload);
                if (phone != null && !phone.isBlank()) {
                    createAndSend(event, NotificationChannel.SMS, phone, "MediPass Notice", formattedSms, correlationId);
                    processed = true;
                }
            } catch (TemplateNotFoundException ex) {
                log.debug("No active SMS template found for eventType={}. Skipping SMS dispatch.", event.getEventType());
            }

            if (!processed) {
                log.warn("No notifications were dispatched for eventType={} (no matching template or missing contact details in payload).", event.getEventType());
            }

        } finally {
            MDC.remove("correlationId");
        }
    }

    private void createAndSend(InboundEvent event, NotificationChannel channel, String destination, String subject, String body, String correlationId) {
        Notification notification = Notification.builder()
                .recipientId(event.getRecipientId() != null ? event.getRecipientId() : UUID.randomUUID())
                .recipientType(event.getRecipientType() != null ? RecipientType.valueOf(event.getRecipientType()) : RecipientType.SYSTEM)
                .recipientAddress(destination)
                .channel(channel)
                .title(subject)
                .message(body)
                .status(NotificationStatus.PENDING)
                .retryCount(0)
                .correlationId(correlationId)
                .build();

        notification = notificationRepository.save(notification);

        sendNotification(notification, destination);
    }

    public void sendNotification(Notification notification, String destination) {
        int attempt = notification.getRetryCount() + 1;
        notification.setRetryCount(attempt);
        
        log.info("Dispatching notification id={} channel={} attempt={}", notification.getId(), notification.getChannel(), attempt);
        try {
            if (notification.getChannel() == NotificationChannel.EMAIL) {
                emailService.sendEmail(destination, notification.getTitle(), notification.getMessage());
            } else if (notification.getChannel() == NotificationChannel.SMS) {
                smsService.sendSms(destination, notification.getMessage());
            }
            
            notification.setStatus(NotificationStatus.DELIVERED);
            notificationRepository.save(notification);

            // Log successful attempt
            NotificationDeliveryLog logEntry = NotificationDeliveryLog.builder()
                    .notificationId(notification.getId())
                    .attemptNumber(attempt)
                    .status(NotificationStatus.DELIVERED.name())
                    .responseMessage("Successfully delivered via " + notification.getChannel())
                    .build();
            deliveryLogRepository.save(logEntry);

        } catch (Exception ex) {
            log.error("Failed delivery attempt={} for notification id={}: {}", attempt, notification.getId(), ex.getMessage());

            NotificationStatus nextStatus = (attempt >= maxRetries) ? NotificationStatus.FAILED : NotificationStatus.RETRYING;
            notification.setStatus(nextStatus);
            notificationRepository.save(notification);

            // Log attempt failure
            NotificationDeliveryLog logEntry = NotificationDeliveryLog.builder()
                    .notificationId(notification.getId())
                    .attemptNumber(attempt)
                    .status(nextStatus.name())
                    .responseMessage("Delivery failed: " + ex.getMessage())
                    .build();
            deliveryLogRepository.save(logEntry);
        }
    }

    @Transactional
    public void retryNotification(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found for ID: " + notificationId));

        if (notification.getRetryCount() >= maxRetries) {
            throw new DeliveryRetryLimitExceededException("Notification " + notificationId + " has exceeded the retry limit of " + maxRetries);
        }

        String destination = notification.getRecipientAddress();
        if (destination == null || destination.isBlank()) {
            destination = (notification.getChannel() == NotificationChannel.SMS) ? "+15550199" : "patient@medipass.com";
        }

        notification.setStatus(NotificationStatus.PENDING);
        notificationRepository.save(notification);

        sendNotification(notification, destination);
    }

    private String getPayloadValue(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            if (payload.containsKey(key) && payload.get(key) != null) {
                return payload.get(key).toString();
            }
        }
        return null;
    }
}
