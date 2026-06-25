package medipass.app.patient.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import medipass.app.patient.entity.Gender;
import medipass.app.patient.entity.MaritalStatus;
import medipass.app.patient.validation.ValidBloodGroup;
import medipass.app.patient.validation.ValidRwandaPhone;

import java.time.LocalDate;

@Data
public class RegisterPatientRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @NotBlank(message = "Phone number is required")
    @ValidRwandaPhone
    private String phoneNumber;

    @NotBlank(message = "National ID is required")
    @Size(min = 10, max = 50, message = "National ID must be between 10 and 50 characters")
    private String nationalId;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth cannot be a future date")
    private LocalDate dateOfBirth;

    @ValidBloodGroup
    private String bloodGroup;

    private MaritalStatus maritalStatus;
}
