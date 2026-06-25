package medipass.app.medical.exception;

import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.exception.DoctorNotFoundException;
import medipass.app.medical.exception.HospitalNotFoundException;
import medipass.app.medical.exception.InvalidMedicalDataException;
import medipass.app.medical.exception.PatientNotFoundException;
import medipass.app.medical.exception.PrescriptionNotFoundException;
import medipass.app.medical.exception.VisitNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice(basePackages = "medipass.app.medical.controller")
@Slf4j
public class MedicalExceptionHandler {

    // =========================================================================
    // 1. RESOURCE NOT FOUND HANDLERS (404 NOT FOUND)
    // =========================================================================

    @ExceptionHandler(VisitNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleVisitNotFound(VisitNotFoundException ex) {
        log.warn("Visit not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(PatientNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handlePatientNotFound(PatientNotFoundException ex) {
        log.warn("Patient not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(HospitalNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleHospitalNotFound(HospitalNotFoundException ex) {
        log.warn("Hospital not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DoctorNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleDoctorNotFound(DoctorNotFoundException ex) {
        log.warn("Doctor not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(PrescriptionNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handlePrescriptionNotFound(PrescriptionNotFoundException ex) {
        log.warn("Prescription not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AllergyNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleAllergyNotFound(AllergyNotFoundException ex) {
        log.warn("Allergy not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    // =========================================================================
    // 2. VALIDATION & BUSINESS LOGIC HANDLERS (400 BAD REQUEST)
    // =========================================================================

    @ExceptionHandler(InvalidMedicalDataException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidMedicalData(InvalidMedicalDataException ex) {
        log.warn("Invalid medical data: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(errors));
    }

    // =========================================================================
    // 3. SECURITY HANDLERS (403 FORBIDDEN)
    // =========================================================================

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthorizationDenied(AuthorizationDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Access Denied: You do not have the required permissions to access this resource."));
    }

    // =========================================================================
    // 4. FALLBACK GLOBAL HANDLER (500 INTERNAL SERVER ERROR)
    // =========================================================================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred"));
    }
}