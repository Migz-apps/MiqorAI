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
public class SystemEventLogResponse {

    private UUID id;
    private String eventId;
    private String serviceName;
    private String eventType;
    private String message;
    private String severity;
    private String correlationId;
    private LocalDateTime createdAt;
}
