package medipass.app.patient.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Pattern(
    regexp = "^(\\+?250|0)?[7][2389]\\d{7}$",
    message = "Phone number must be a valid Rwanda format"
)
public @interface ValidRwandaPhone {
    String message() default "Phone number must be a valid Rwanda format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
