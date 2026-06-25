package medipass.app.patient.exception;

public class DuplicateEmergencyContactException extends RuntimeException {
    public DuplicateEmergencyContactException(String message) {
        super(message);
    }
}
