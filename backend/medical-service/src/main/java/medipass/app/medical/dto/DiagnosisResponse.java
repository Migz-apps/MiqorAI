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
public class DiagnosisResponse {

    private UUID id;
    private UUID visitId;
    private UUID doctorId;
    private String diagnosisName;
    private String diagnosisNotes;
    private LocalDateTime diagnosedAt;
}
