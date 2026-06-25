package medipass.app.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import medipass.app.medical.entity.AllergySeverity;

import java.util.UUID;

@Data
public class AddAllergyRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    @NotBlank(message = "Allergy name is required")
    private String allergyName;

    @NotNull(message = "Severity is required")
    private AllergySeverity severity;

    private String reaction;
}
