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
public class AllergyResponse {

    private UUID id;
    private UUID patientId;
    private String allergyName;
    private String severity;
    private String reaction;
    private LocalDateTime recordedAt;
}
