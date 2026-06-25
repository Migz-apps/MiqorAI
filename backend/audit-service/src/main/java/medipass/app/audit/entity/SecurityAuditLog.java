package medipass.app.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "security_audit_logs",
    schema = "audit_schema",
    indexes = {
        @Index(name = "idx_sec_audit_user_id",        columnList = "user_id"),
        @Index(name = "idx_sec_audit_ip_address",     columnList = "ip_address"),
        @Index(name = "idx_sec_audit_correlation_id", columnList = "correlation_id"),
        @Index(name = "idx_sec_audit_created_at",     columnList = "created_at")
    }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", unique = true, length = 100)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
