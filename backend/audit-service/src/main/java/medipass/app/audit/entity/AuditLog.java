package medipass.app.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "audit_logs",
    schema = "audit_schema",
    indexes = {
        @Index(name = "idx_audit_log_correlation_id",  columnList = "correlation_id"),
        @Index(name = "idx_audit_log_entity_id",       columnList = "entity_id"),
        @Index(name = "idx_audit_log_service_name",    columnList = "service_name"),
        @Index(name = "idx_audit_log_actor_id",        columnList = "actor_id"),
        @Index(name = "idx_audit_log_created_at",      columnList = "created_at")
    }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", unique = true, length = 100)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Column(name = "action", length = 100)
    private String action;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    /**
     * Stored as JSONB in PostgreSQL for efficient querying.
     * Serialized as a JSON string at the application layer.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    // Immutability: no setters — all fields set via builder only
}
