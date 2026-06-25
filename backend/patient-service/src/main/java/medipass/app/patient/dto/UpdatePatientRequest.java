package medipass.app.patient.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import medipass.app.patient.entity.MaritalStatus;
import medipass.app.patient.validation.ValidBloodGroup;
import medipass.app.patient.validation.ValidRwandaPhone;

@Data
public class UpdatePatientRequest {

    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @ValidRwandaPhone
    private String phoneNumber;

    @ValidBloodGroup
    private String bloodGroup;

    private MaritalStatus maritalStatus;

    private String profilePictureUrl;
}
