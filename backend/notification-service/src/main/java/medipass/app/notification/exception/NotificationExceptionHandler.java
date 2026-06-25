package medipass.app.notification.exception;

import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "medipass.app.notification.controller")
@Slf4j
public class NotificationExceptionHandler {

    @ExceptionHandler(TemplateNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleTemplateNotFound(TemplateNotFoundException ex) {
        log.warn("Template not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(InvalidNotificationChannelException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidChannel(InvalidNotificationChannelException ex) {
        log.warn("Invalid notification channel: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DeliveryRetryLimitExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleRetryLimitExceeded(DeliveryRetryLimitExceededException ex) {
        log.warn("Delivery retry limit exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(NotificationSendFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleSendFailure(NotificationSendFailureException ex) {
        log.error("Notification send failure: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred: " + ex.getMessage()));
    }
}
