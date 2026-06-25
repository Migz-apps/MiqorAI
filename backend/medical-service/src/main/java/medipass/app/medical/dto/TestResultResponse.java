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
public class TestResultResponse {

    private UUID id;
    private UUID visitId;
    private UUID hospitalId;
    private UUID doctorId;
    private String testName;
    private String result;
    private String unit;
    private String referenceRange;
    private String status;
    private LocalDateTime createdAt;
}
