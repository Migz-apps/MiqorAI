package medipass.app.patient.exception;

public class InvalidQRCodeException extends RuntimeException {
    public InvalidQRCodeException(String message) {
        super(message);
    }
}
