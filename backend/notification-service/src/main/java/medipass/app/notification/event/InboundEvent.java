package medipass.app.notification.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InboundEvent {
    private UUID eventId;
    private String eventType;
    private String serviceName;
    private UUID recipientId;
    private String recipientType; // PATIENT, DOCTOR, ADMIN, SYSTEM
    private String correlationId;
    private String timestamp;
    private Map<String, Object> payload;
}
