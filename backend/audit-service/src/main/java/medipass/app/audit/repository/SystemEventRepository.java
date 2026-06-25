package medipass.app.audit.repository;

import medipass.app.audit.entity.SystemEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SystemEventRepository extends JpaRepository<SystemEventLog, UUID> {

    Page<SystemEventLog> findByServiceNameOrderByCreatedAtDesc(String serviceName, Pageable pageable);

    Page<SystemEventLog> findBySeverityOrderByCreatedAtDesc(String severity, Pageable pageable);

    Page<SystemEventLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByEventId(String eventId);
}
