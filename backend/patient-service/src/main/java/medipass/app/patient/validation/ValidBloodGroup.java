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
    regexp = "^(A|B|AB|O)[+-]$",
    message = "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-"
)
public @interface ValidBloodGroup {
    String message() default "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
