package medipass.app.audit.exception;

public class DuplicateAuditEventException extends RuntimeException {
    public DuplicateAuditEventException(String message) { super(message); }
}
