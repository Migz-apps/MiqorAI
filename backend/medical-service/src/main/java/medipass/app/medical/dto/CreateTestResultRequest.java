package medipass.app.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import medipass.app.medical.entity.TestStatus;

import java.util.UUID;

@Data
public class CreateTestResultRequest {

    @NotNull(message = "Visit ID is required")
    private UUID visitId;

    @NotBlank(message = "Test name is required")
    private String testName;

    @NotBlank(message = "Result is required")
    private String result;

    private String unit;

    private String referenceRange;

    private TestStatus status;
}
