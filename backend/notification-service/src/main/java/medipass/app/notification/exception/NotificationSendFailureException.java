package medipass.app.notification.exception;

public class NotificationSendFailureException extends RuntimeException {
    public NotificationSendFailureException(String message) {
        super(message);
    }
    public NotificationSendFailureException(String message, Throwable cause) {
        super(message, cause);
    }
}
