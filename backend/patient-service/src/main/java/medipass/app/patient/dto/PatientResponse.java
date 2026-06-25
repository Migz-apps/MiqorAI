package medipass.app.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {

    private UUID id;
    private String firstName;
    private String lastName;
    private String gender;
    private String phoneNumber;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String maritalStatus;
    private String profilePictureUrl;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
