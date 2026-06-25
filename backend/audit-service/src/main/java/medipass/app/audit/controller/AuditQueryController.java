package medipass.app.audit.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.dto.ApiResponse;
import medipass.app.audit.dto.AuditLogResponse;
import medipass.app.audit.dto.SecurityAuditLogResponse;
import medipass.app.audit.dto.SystemEventLogResponse;
import medipass.app.audit.service.AuditLogService;
import medipass.app.audit.service.SecurityAuditService;
import medipass.app.audit.service.SystemEventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Audit Query", description = "Administrative query interfaces for all audit registries")
@SecurityRequirement(name = "bearerAuth")
public class AuditQueryController {

    private final AuditLogService auditLogService;
    private final SecurityAuditService securityAuditService;
    private final SystemEventService systemEventService;

    @GetMapping("/logs")
    @Operation(summary = "Retrieve a paginated list of all general business audit logs")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAllLogs(Pageable pageable) {
        log.info("Request to fetch all audit logs, pageable={}", pageable);
        Page<AuditLogResponse> logs = auditLogService.getAllLogs(pageable);
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved successfully", logs));
    }

    @GetMapping("/logs/correlation/{correlationId}")
    @Operation(summary = "Retrieve general audit logs by a specific Correlation ID")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getLogsByCorrelationId(
            @PathVariable String correlationId) {
        log.info("Request to fetch audit logs for correlationId={}", correlationId);
        List<AuditLogResponse> logs = auditLogService.getLogsByCorrelationId(correlationId);
        return ResponseEntity.ok(ApiResponse.success("Audit logs for correlation ID retrieved", logs));
    }

    @GetMapping("/logs/entity/{entityId}")
    @Operation(summary = "Retrieve a paginated list of general audit logs for a specific Entity ID")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getLogsByEntity(
            @PathVariable UUID entityId, Pageable pageable) {
        log.info("Request to fetch audit logs for entityId={}, pageable={}", entityId, pageable);
        Page<AuditLogResponse> logs = auditLogService.getLogsByEntity(entityId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Audit logs for entity retrieved", logs));
    }

    @GetMapping("/logs/service/{serviceName}")
    @Operation(summary = "Retrieve a paginated list of general audit logs for a specific Service Name")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getLogsByService(
            @PathVariable String serviceName, Pageable pageable) {
        log.info("Request to fetch audit logs for serviceName={}, pageable={}", serviceName, pageable);
        Page<AuditLogResponse> logs = auditLogService.getLogsByService(serviceName, pageable);
        return ResponseEntity.ok(ApiResponse.success("Audit logs for service retrieved", logs));
    }

    @GetMapping("/security")
    @Operation(summary = "Retrieve a paginated list of all security audit logs")
    public ResponseEntity<ApiResponse<Page<SecurityAuditLogResponse>>> getAllSecurityLogs(Pageable pageable) {
        log.info("Request to fetch all security audit logs, pageable={}", pageable);
        Page<SecurityAuditLogResponse> logs = securityAuditService.getAllSecurityLogs(pageable);
        return ResponseEntity.ok(ApiResponse.success("Security logs retrieved successfully", logs));
    }

    @GetMapping("/security/user/{userId}")
    @Operation(summary = "Retrieve a paginated list of security audit logs for a specific User ID")
    public ResponseEntity<ApiResponse<Page<SecurityAuditLogResponse>>> getSecurityLogsByUser(
            @PathVariable UUID userId, Pageable pageable) {
        log.info("Request to fetch security logs for userId={}, pageable={}", userId, pageable);
        Page<SecurityAuditLogResponse> logs = securityAuditService.getSecurityLogsByUser(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Security logs for user retrieved", logs));
    }

    @GetMapping("/system")
    @Operation(summary = "Retrieve a paginated list of all system infrastructure logs")
    public ResponseEntity<ApiResponse<Page<SystemEventLogResponse>>> getAllSystemEvents(Pageable pageable) {
        log.info("Request to fetch all system events, pageable={}", pageable);
        Page<SystemEventLogResponse> logs = systemEventService.getAllSystemEvents(pageable);
        return ResponseEntity.ok(ApiResponse.success("System events retrieved successfully", logs));
    }

    @GetMapping("/system/service/{serviceName}")
    @Operation(summary = "Retrieve a paginated list of system events for a specific Service Name")
    public ResponseEntity<ApiResponse<Page<SystemEventLogResponse>>> getSystemEventsByService(
            @PathVariable String serviceName, Pageable pageable) {
        log.info("Request to fetch system events for serviceName={}, pageable={}", serviceName, pageable);
        Page<SystemEventLogResponse> logs = systemEventService.getSystemEventsByService(serviceName, pageable);
        return ResponseEntity.ok(ApiResponse.success("System events for service retrieved", logs));
    }

    @GetMapping("/system/severity/{severity}")
    @Operation(summary = "Retrieve a paginated list of system events by Severity level (e.g. INFO, WARN, ERROR)")
    public ResponseEntity<ApiResponse<Page<SystemEventLogResponse>>> getSystemEventsBySeverity(
            @PathVariable String severity, Pageable pageable) {
        log.info("Request to fetch system events for severity={}, pageable={}", severity, pageable);
        Page<SystemEventLogResponse> logs = systemEventService.getSystemEventsBySeverity(severity, pageable);
        return ResponseEntity.ok(ApiResponse.success("System events for severity retrieved", logs));
    }
}
