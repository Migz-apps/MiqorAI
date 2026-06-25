package medipass.app.medical.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitResponse {

    private UUID id;
    private UUID patientId;
    private UUID hospitalId;
    private UUID doctorId;
    private String visitReason;
    private String diagnosis;
    private String notes;
    private String status;
    private LocalDateTime visitDate;
    private LocalDateTime createdAt;
}
