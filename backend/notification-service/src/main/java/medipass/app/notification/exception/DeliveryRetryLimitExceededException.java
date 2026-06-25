package medipass.app.notification.exception;

public class DeliveryRetryLimitExceededException extends RuntimeException {
    public DeliveryRetryLimitExceededException(String message) {
        super(message);
    }
}
