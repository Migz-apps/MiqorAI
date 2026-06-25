package medipass.app.medical.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateHospitalRequest {

    @NotBlank(message = "Hospital code is required")
    private String hospitalCode;

    @NotBlank(message = "Hospital name is required")
    private String hospitalName;

    @NotBlank(message = "Hospital email is required")
    @Email(message = "Hospital email must be valid")
    private String email;

    private String phoneNumber;
    private String address;
    private String district;
    private String sector;
}
