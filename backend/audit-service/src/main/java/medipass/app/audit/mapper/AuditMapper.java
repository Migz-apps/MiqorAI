package medipass.app.audit.mapper;

import medipass.app.audit.dto.AuditLogResponse;
import medipass.app.audit.dto.SecurityAuditLogResponse;
import medipass.app.audit.dto.SystemEventLogResponse;
import medipass.app.audit.entity.AuditLog;
import medipass.app.audit.entity.SecurityAuditLog;
import medipass.app.audit.entity.SystemEventLog;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AuditMapper {

    AuditLogResponse toAuditLogResponse(AuditLog auditLog);

    SecurityAuditLogResponse toSecurityAuditLogResponse(SecurityAuditLog log);

    SystemEventLogResponse toSystemEventLogResponse(SystemEventLog log);
}
