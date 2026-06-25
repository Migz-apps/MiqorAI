package medipass.app.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.entity.RecipientType;
import medipass.app.notification.event.InboundEvent;
import medipass.app.notification.service.NotificationService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventConsumer {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${rabbitmq.queue:notification.events}")
    public void consumeNotificationEvent(Object rawEvent) {
        try {
            InboundEvent event = toInboundEvent(rawEvent);
            if (event.getEventType() == null) {
                log.warn("Skipping notification event with no event type");
                return;
            }
            notificationService.processEvent(event);
        } catch (Exception ex) {
            log.error("Failed to process notification event: {}", ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private InboundEvent toInboundEvent(Object rawEvent) {
        if (rawEvent instanceof InboundEvent inboundEvent) {
            return inboundEvent;
        }

        Map<String, Object> map = objectMapper.convertValue(rawEvent, Map.class);

        String eventType = firstNonNull(map, "eventType", "type");
        UUID patientId = parseUuid(firstNonNull(map, "patientId", "entityId", "recipientId"));

        Map<String, Object> payload = new HashMap<>();
        if (map.get("data") instanceof Map<?, ?> dataMap) {
            dataMap.forEach((k, v) -> payload.put(String.valueOf(k), v));
        }
        map.forEach((k, v) -> {
            if (!"data".equals(k) && v != null) {
                payload.putIfAbsent(k, v);
            }
        });

        return InboundEvent.builder()
                .eventId(parseUuid(firstNonNull(map, "eventId")))
                .eventType(eventType)
                .serviceName(firstNonNull(map, "serviceName", "medipass-app"))
                .recipientId(patientId)
                .recipientType(RecipientType.PATIENT.name())
                .correlationId(firstNonNull(map, "correlationId"))
                .timestamp(firstNonNull(map, "timestamp"))
                .payload(payload)
                .build();
    }

    private String firstNonNull(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null) {
                return value.toString();
            }
        }
        return null;
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
