package medipass.app.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    private UUID id;
    private String eventId;
    private String eventType;
    private String serviceName;
    private String action;
    private UUID actorId;
    private UUID entityId;
    private String entityType;
    private String correlationId;
    private String payload;
    private LocalDateTime createdAt;
}
