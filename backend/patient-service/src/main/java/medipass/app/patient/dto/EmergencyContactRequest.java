package medipass.app.patient.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import medipass.app.patient.validation.ValidRwandaPhone;

@Data
public class EmergencyContactRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String fullName;

    @NotBlank(message = "Relationship is required")
    @Size(max = 100, message = "Relationship must not exceed 100 characters")
    private String relationship;

    @NotBlank(message = "Phone number is required")
    @ValidRwandaPhone
    private String phoneNumber;
}
