package medipass.app.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.dto.AuditLogResponse;
import medipass.app.audit.entity.AuditLog;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.AuditEventValidationException;
import medipass.app.audit.exception.AuditPersistenceException;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.mapper.AuditMapper;
import medipass.app.audit.repository.AuditLogRepository;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditMapper auditMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public void saveAuditLog(InboundAuditEvent event) {
        validateEvent(event);

        // Idempotency — skip if already persisted
        if (event.getEventId() != null && auditLogRepository.existsByEventId(event.getEventId())) {
            throw new DuplicateAuditEventException("Duplicate event ignored: " + event.getEventId());
        }

        String payloadJson = serializePayload(event.getData());

        AuditLog auditLog = AuditLog.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .serviceName(event.getServiceName())
                .action(event.getAction())
                .actorId(event.getActorId())
                .entityId(event.getEntityId())
                .entityType(event.getEntityType())
                .correlationId(event.getCorrelationId())
                .payload(payloadJson)
                .build();

        try {
            auditLogRepository.save(auditLog);
            log.info("Audit log saved eventType={} correlationId={} service={}",
                    event.getEventType(), event.getCorrelationId(), event.getServiceName());
        } catch (Exception ex) {
            throw new AuditPersistenceException("Failed to persist audit log: " + ex.getMessage(), ex);
        }
    }

    public List<AuditLogResponse> getLogsByCorrelationId(String correlationId) {
        return auditLogRepository.findByCorrelationIdOrderByCreatedAtDesc(correlationId).stream()
                .map(auditMapper::toAuditLogResponse)
                .collect(Collectors.toList());
    }

    public Page<AuditLogResponse> getLogsByEntity(UUID entityId, Pageable pageable) {
        return auditLogRepository.findByEntityIdOrderByCreatedAtDesc(entityId, pageable)
                .map(auditMapper::toAuditLogResponse);
    }

    public Page<AuditLogResponse> getLogsByService(String serviceName, Pageable pageable) {
        return auditLogRepository.findByServiceNameOrderByCreatedAtDesc(serviceName, pageable)
                .map(auditMapper::toAuditLogResponse);
    }

    public Page<AuditLogResponse> getAllLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(auditMapper::toAuditLogResponse);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void validateEvent(InboundAuditEvent event) {
        if (event.getEventType() == null || event.getEventType().isBlank()) {
            throw new AuditEventValidationException("eventType is required");
        }
        if (event.getServiceName() == null || event.getServiceName().isBlank()) {
            throw new AuditEventValidationException("serviceName is required");
        }
        if (event.getCorrelationId() == null || event.getCorrelationId().isBlank()) {
            throw new AuditEventValidationException("correlationId is required");
        }
    }

    private String serializePayload(Object data) {
        if (data == null) return "{}";
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize event payload: {}", ex.getMessage());
            return "{}";
        }
    }
}
