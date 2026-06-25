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
public class HospitalResponse {

    private UUID id;
    private String hospitalCode;
    private String hospitalName;
    private String email;
    private String phoneNumber;
    private String address;
    private String district;
    private String sector;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
