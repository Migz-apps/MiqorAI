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
public class PatientContinuitySummaryResponse {

    private UUID patientId;
    private String summary;
    private LocalDateTime lastUpdated;
    private int totalVisits;
    private int totalHospitalsVisited;
    private int totalDoctorsSeen;
    private int totalDiagnoses;
    private int totalPrescriptions;
    private int totalTests;
    private List<HospitalResponse> hospitalsVisited;
    private List<DoctorResponse> doctorsSeen;
    private List<VisitResponse> recentVisits;
    private List<DiagnosisResponse> recentDiagnoses;
    private List<PrescriptionResponse> recentPrescriptions;
    private List<TestResultResponse> recentTests;
}
