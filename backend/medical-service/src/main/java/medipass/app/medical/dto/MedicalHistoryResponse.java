package medipass.app.medical.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalHistoryResponse {

    private UUID patientId;
    private String summary;
    private LocalDateTime lastUpdated;
    private List<VisitResponse> visits;
    private List<AllergyResponse> allergies;
    private int totalVisits;
    private int totalAllergies;
}
