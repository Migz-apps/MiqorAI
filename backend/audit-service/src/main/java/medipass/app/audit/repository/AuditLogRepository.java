package medipass.app.audit.repository;

import medipass.app.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByCorrelationIdOrderByCreatedAtDesc(String correlationId);

    Page<AuditLog> findByEntityIdOrderByCreatedAtDesc(UUID entityId, Pageable pageable);

    Page<AuditLog> findByServiceNameOrderByCreatedAtDesc(String serviceName, Pageable pageable);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByEventId(String eventId);

    Optional<AuditLog> findByEventId(String eventId);
}
