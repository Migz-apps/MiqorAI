package medipass.app.medical.producer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.event.MedicalEvent;
import medipass.common.event.DomainEvent;
import medipass.common.event.DomainEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class MedicalEventProducer {

    private final DomainEventPublisher domainEventPublisher;

    @Value("${spring.application.name:medical-service}")
    private String serviceName;

    public void publishEvent(String routingKey, MedicalEvent event) {
        String entityType = resolveEntityType(event.getType());
        UUID entityId = resolveEntityId(event);

        DomainEvent domainEvent = DomainEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getType())
                .serviceName(serviceName)
                .entityId(entityId)
                .entityType(entityType)
                .timestamp(event.getTimestamp())
                .data(event.getData())
                .build();

        domainEventPublisher.publish(routingKey, domainEvent);
    }

    private String resolveEntityType(String eventType) {
        if (eventType == null || !eventType.contains(".")) {
            return "medical";
        }
        return eventType.substring(0, eventType.indexOf('.'));
    }

    private UUID resolveEntityId(MedicalEvent event) {
        if (event.getData() != null) {
            for (String key : new String[]{"visitId", "prescriptionId", "testId", "allergyId"}) {
                Object value = event.getData().get(key);
                if (value != null) {
                    return UUID.fromString(value.toString());
                }
            }
        }
        return event.getPatientId();
    }
}
