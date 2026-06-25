package medipass.app.audit.repository;

import medipass.app.audit.entity.SecurityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityAuditRepository extends JpaRepository<SecurityAuditLog, UUID> {

    Page<SecurityAuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<SecurityAuditLog> findByIpAddressOrderByCreatedAtDesc(String ipAddress);

    Page<SecurityAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByEventId(String eventId);
}
