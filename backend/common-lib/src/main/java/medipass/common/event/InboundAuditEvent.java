package medipass.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

/**
 * Standard inbound event envelope consumed from RabbitMQ.
 * All publishing services MUST conform to this structure.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InboundAuditEvent {

    private String eventId;
    private String eventType;
    private String serviceName;
    private UUID actorId;
    private UUID entityId;
    private String entityType;
    private String correlationId;
    private String timestamp;
    private Map<String, Object> data;

    private UUID userId;
    private String ipAddress;
    private String userAgent;
    private String action;
    private String status;

    private String message;
    private String severity;
}
