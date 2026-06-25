package medipass.common.exception;

public final class SafeErrorMessages {

    private SafeErrorMessages() {
    }

    public static final String GENERIC_ERROR = "An unexpected error occurred. Please try again later.";
    public static final String UNAUTHORIZED = "You are not authorized to perform this action.";
    public static final String INVALID_CREDENTIALS = "Invalid credentials.";
    public static final String RESOURCE_NOT_FOUND = "The requested resource was not found.";
    public static final String VALIDATION_FAILED = "The request could not be processed due to invalid data.";
    public static final String SERVICE_UNAVAILABLE = "The service is temporarily unavailable. Please try again later.";
}
