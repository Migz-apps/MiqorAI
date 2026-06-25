package medipass.app.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import medipass.app.medical.entity.VisitStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateVisitRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    @NotNull(message = "Hospital ID is required")
    private UUID hospitalId;

    @NotNull(message = "Doctor ID is required")
    private UUID doctorId;

    @NotBlank(message = "Visit reason is required")
    private String visitReason;

    private String diagnosis;

    private String notes;

    private VisitStatus status;

    private LocalDateTime visitDate;
}
