package medipass.app.audit.event;

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

    /** Unique event identifier — used for idempotency / duplicate prevention. */
    private String eventId;

    /** Dot-notation event type, e.g. "visit.created", "auth.login.failed". */
    private String eventType;

    /** Name of the originating service, e.g. "medical-record-service". */
    private String serviceName;

    /** ID of the user or system actor that triggered the event. */
    private UUID actorId;

    /** ID of the primary entity affected by the event. */
    private UUID entityId;

    /** Type of the entity, e.g. "visit", "patient", "prescription". */
    private String entityType;

    /** Correlation ID for distributed tracing across services. */
    private String correlationId;

    /** ISO-8601 timestamp string from the originating service. */
    private String timestamp;

    /** Arbitrary event-specific data. */
    private Map<String, Object> data;

    // ── Security-specific fields (populated for auth/security events) ──────

    private UUID userId;
    private String ipAddress;
    private String userAgent;
    private String action;
    private String status;

    // ── System-event-specific fields ────────────────────────────────────────

    private String message;
    private String severity;
}
