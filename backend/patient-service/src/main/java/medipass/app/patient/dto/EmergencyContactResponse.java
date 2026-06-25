package medipass.app.patient.dto;

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
public class EmergencyContactResponse {

    private UUID id;
    private UUID patientId;
    private String fullName;
    private String relationship;
    private String phoneNumber;
    private LocalDateTime createdAt;
}
