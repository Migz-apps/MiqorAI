package medipass.app.integration.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class PatientExistsResponse {

    private Boolean success;
    private String message;
    private PatientData data;

    @Data
    public static class PatientData {
        private UUID id;
        private String firstName;
        private String lastName;
        private Boolean active;
    }
}
