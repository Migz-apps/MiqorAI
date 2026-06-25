package medipass.common.event;

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
public class DomainEvent {

    private String eventId;
    private String eventType;
    private String serviceName;
    private UUID actorId;
    private UUID entityId;
    private String entityType;
    private String correlationId;
    private String timestamp;
    private Map<String, Object> data;
}
