package medipass.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import medipass.app.auth.entity.Role;

@Data
public class RegisterRequest {

    @NotBlank(message = "Phone number is required")
    @Pattern(
        regexp = "^(\\+?250|0)?[7][2389]\\d{7}$",
        message = "Phone number must be a valid Rwanda format"
    )
    private String phoneNumber;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    )
    private String password;

    @NotNull(message = "Role is required")
    private Role role;
}
