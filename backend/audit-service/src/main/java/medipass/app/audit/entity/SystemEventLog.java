package medipass.app.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "system_event_logs",
    schema = "audit_schema",
    indexes = {
        @Index(name = "idx_sys_event_service_name",    columnList = "service_name"),
        @Index(name = "idx_sys_event_severity",        columnList = "severity"),
        @Index(name = "idx_sys_event_correlation_id",  columnList = "correlation_id"),
        @Index(name = "idx_sys_event_created_at",      columnList = "created_at")
    }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", unique = true, length = 100)
    private String eventId;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "severity", nullable = false, length = 20)
    private String severity;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
