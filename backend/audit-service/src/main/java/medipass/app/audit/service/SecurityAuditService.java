package medipass.app.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.dto.SecurityAuditLogResponse;
import medipass.app.audit.entity.SecurityAuditLog;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.AuditPersistenceException;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.mapper.AuditMapper;
import medipass.app.audit.repository.SecurityAuditRepository;
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
public class SecurityAuditService {

    private final SecurityAuditRepository securityAuditRepository;
    private final AuditMapper auditMapper;

    @Transactional
    public void saveSecurityLog(InboundAuditEvent event) {
        if (event.getEventId() != null && securityAuditRepository.existsByEventId(event.getEventId())) {
            throw new DuplicateAuditEventException("Duplicate security event ignored: " + event.getEventId());
        }

        SecurityAuditLog securityLog = SecurityAuditLog.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .userId(event.getUserId() != null ? event.getUserId() : event.getActorId())
                .ipAddress(event.getIpAddress())
                .userAgent(event.getUserAgent())
                .action(event.getAction() != null ? event.getAction() : event.getEventType())
                .status(event.getStatus() != null ? event.getStatus() : "UNKNOWN")
                .correlationId(event.getCorrelationId())
                .build();

        try {
            securityAuditRepository.save(securityLog);
            log.info("Security audit log saved eventType={} correlationId={}",
                    event.getEventType(), event.getCorrelationId());
        } catch (Exception ex) {
            throw new AuditPersistenceException("Failed to persist security audit log: " + ex.getMessage(), ex);
        }
    }

    public Page<SecurityAuditLogResponse> getSecurityLogsByUser(UUID userId, Pageable pageable) {
        return securityAuditRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(auditMapper::toSecurityAuditLogResponse);
    }

    public List<SecurityAuditLogResponse> getSecurityLogsByIp(String ipAddress) {
        return securityAuditRepository.findByIpAddressOrderByCreatedAtDesc(ipAddress).stream()
                .map(auditMapper::toSecurityAuditLogResponse)
                .collect(Collectors.toList());
    }

    public Page<SecurityAuditLogResponse> getAllSecurityLogs(Pageable pageable) {
        return securityAuditRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(auditMapper::toSecurityAuditLogResponse);
    }
}
