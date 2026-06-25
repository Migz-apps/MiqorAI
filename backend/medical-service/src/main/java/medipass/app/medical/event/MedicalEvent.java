package medipass.app.medical.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalEvent {

    private String eventId;
    private String type;
    private UUID patientId;
    private String timestamp;
    private Map<String, Object> data;

    public static MedicalEvent of(String type, UUID patientId, Map<String, Object> data) {
        return MedicalEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .type(type)
                .patientId(patientId)
                .timestamp(LocalDateTime.now().toString())
                .data(data)
                .build();
    }
}
