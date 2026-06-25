package medipass.app.audit.mapper;

import javax.annotation.processing.Generated;
import medipass.app.audit.dto.AuditLogResponse;
import medipass.app.audit.dto.SecurityAuditLogResponse;
import medipass.app.audit.dto.SystemEventLogResponse;
import medipass.app.audit.entity.AuditLog;
import medipass.app.audit.entity.SecurityAuditLog;
import medipass.app.audit.entity.SystemEventLog;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-23T15:39:32+0200",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class AuditMapperImpl implements AuditMapper {

    @Override
    public AuditLogResponse toAuditLogResponse(AuditLog auditLog) {
        if ( auditLog == null ) {
            return null;
        }

        AuditLogResponse.AuditLogResponseBuilder auditLogResponse = AuditLogResponse.builder();

        auditLogResponse.action( auditLog.getAction() );
        auditLogResponse.actorId( auditLog.getActorId() );
        auditLogResponse.correlationId( auditLog.getCorrelationId() );
        auditLogResponse.createdAt( auditLog.getCreatedAt() );
        auditLogResponse.entityId( auditLog.getEntityId() );
        auditLogResponse.entityType( auditLog.getEntityType() );
        auditLogResponse.eventId( auditLog.getEventId() );
        auditLogResponse.eventType( auditLog.getEventType() );
        auditLogResponse.id( auditLog.getId() );
        auditLogResponse.payload( auditLog.getPayload() );
        auditLogResponse.serviceName( auditLog.getServiceName() );

        return auditLogResponse.build();
    }

    @Override
    public SecurityAuditLogResponse toSecurityAuditLogResponse(SecurityAuditLog log) {
        if ( log == null ) {
            return null;
        }

        SecurityAuditLogResponse.SecurityAuditLogResponseBuilder securityAuditLogResponse = SecurityAuditLogResponse.builder();

        securityAuditLogResponse.action( log.getAction() );
        securityAuditLogResponse.correlationId( log.getCorrelationId() );
        securityAuditLogResponse.createdAt( log.getCreatedAt() );
        securityAuditLogResponse.eventId( log.getEventId() );
        securityAuditLogResponse.eventType( log.getEventType() );
        securityAuditLogResponse.id( log.getId() );
        securityAuditLogResponse.ipAddress( log.getIpAddress() );
        securityAuditLogResponse.status( log.getStatus() );
        securityAuditLogResponse.userId( log.getUserId() );

        return securityAuditLogResponse.build();
    }

    @Override
    public SystemEventLogResponse toSystemEventLogResponse(SystemEventLog log) {
        if ( log == null ) {
            return null;
        }

        SystemEventLogResponse.SystemEventLogResponseBuilder systemEventLogResponse = SystemEventLogResponse.builder();

        systemEventLogResponse.correlationId( log.getCorrelationId() );
        systemEventLogResponse.createdAt( log.getCreatedAt() );
        systemEventLogResponse.eventId( log.getEventId() );
        systemEventLogResponse.eventType( log.getEventType() );
        systemEventLogResponse.id( log.getId() );
        systemEventLogResponse.message( log.getMessage() );
        systemEventLogResponse.serviceName( log.getServiceName() );
        systemEventLogResponse.severity( log.getSeverity() );

        return systemEventLogResponse.build();
    }
}
