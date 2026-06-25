package medipass.app.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.dto.SystemEventLogResponse;
import medipass.app.audit.entity.SystemEventLog;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.AuditPersistenceException;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.mapper.AuditMapper;
import medipass.app.audit.repository.SystemEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemEventService {

    private final SystemEventRepository systemEventRepository;
    private final AuditMapper auditMapper;

    @Transactional
    public void saveSystemEvent(InboundAuditEvent event) {
        if (event.getEventId() != null && systemEventRepository.existsByEventId(event.getEventId())) {
            throw new DuplicateAuditEventException("Duplicate system event ignored: " + event.getEventId());
        }

        SystemEventLog systemLog = SystemEventLog.builder()
                .eventId(event.getEventId())
                .serviceName(event.getServiceName() != null ? event.getServiceName() : "unknown")
                .eventType(event.getEventType())
                .message(event.getMessage())
                .severity(event.getSeverity() != null ? event.getSeverity() : "INFO")
                .correlationId(event.getCorrelationId())
                .build();

        try {
            systemEventRepository.save(systemLog);
            log.info("System event log saved eventType={} service={} severity={}",
                    event.getEventType(), event.getServiceName(), event.getSeverity());
        } catch (Exception ex) {
            throw new AuditPersistenceException("Failed to persist system event log: " + ex.getMessage(), ex);
        }
    }

    public Page<SystemEventLogResponse> getSystemEventsByService(String serviceName, Pageable pageable) {
        return systemEventRepository.findByServiceNameOrderByCreatedAtDesc(serviceName, pageable)
                .map(auditMapper::toSystemEventLogResponse);
    }

    public Page<SystemEventLogResponse> getSystemEventsBySeverity(String severity, Pageable pageable) {
        return systemEventRepository.findBySeverityOrderByCreatedAtDesc(severity, pageable)
                .map(auditMapper::toSystemEventLogResponse);
    }

    public Page<SystemEventLogResponse> getAllSystemEvents(Pageable pageable) {
        return systemEventRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(auditMapper::toSystemEventLogResponse);
    }
}
