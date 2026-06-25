package medipass.common.security;

import lombok.Getter;

@Getter
public class JwtValidationException extends RuntimeException {

    private final boolean expired;

    public JwtValidationException(String message, boolean expired) {
        super(message);
        this.expired = expired;
    }
}
