package medipass.app.audit.exception;

import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "medipass.app.audit.controller")
@Slf4j
public class AuditExceptionHandler {

    @ExceptionHandler(AuditEventValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(AuditEventValidationException ex) {
        log.warn("Audit event validation failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateAuditEventException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateAuditEventException ex) {
        log.warn("Duplicate audit event: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(InvalidEventFormatException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidFormat(InvalidEventFormatException ex) {
        log.warn("Invalid event format: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AuditPersistenceException.class)
    public ResponseEntity<ApiResponse<Void>> handlePersistence(AuditPersistenceException ex) {
        log.error("Audit persistence error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred"));
    }
}
