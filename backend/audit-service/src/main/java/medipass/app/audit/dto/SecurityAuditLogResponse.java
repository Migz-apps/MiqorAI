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
public class SecurityAuditLogResponse {

    private UUID id;
    private String eventId;
    private String eventType;
    private UUID userId;
    private String ipAddress;
    private String action;
    private String status;
    private String correlationId;
    private LocalDateTime createdAt;
}
