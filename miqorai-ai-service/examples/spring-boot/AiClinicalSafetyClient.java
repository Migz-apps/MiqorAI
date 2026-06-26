package medipass.app.integration;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Calls the MiqorAI Python FastAPI service before allowing a doctor to order a test
 * or prescribe medication. If intervention_required is true, block the workflow and
 * surface the alert to the doctor UI.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiClinicalSafetyClient {

    private final RestClient restClient;

    @Value("${services.miqorai.url:http://localhost:8000}")
    private String miqorAiServiceUrl;

    public ClinicalSafetyAlert checkClinicalSafety(ClinicalSafetyRequest request) {
        try {
            ClinicalSafetyAlert alert = restClient.post()
                    .uri(miqorAiServiceUrl + "/clinical-safety/check")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(ClinicalSafetyAlert.class);

            if (alert == null) {
                return safeFallback("Empty response from MiqorAI service");
            }

            log.info(
                    "MiqorAI alert patientId={} title={} severity={} interventionRequired={}",
                    request.patientRecord().patientId(),
                    alert.alertTitle(),
                    alert.severity(),
                    alert.interventionRequired()
            );
            return alert;
        } catch (RestClientException ex) {
            log.error("MiqorAI service call failed: {}", ex.getMessage());
            return safeFallback("MiqorAI service unavailable");
        }
    }

    public ClinicalSafetyAlert checkClinicalSafetyMock(ClinicalSafetyRequest request) {
        ClinicalSafetyAlert alert = restClient.post()
                .uri(miqorAiServiceUrl + "/clinical-safety/check/mock")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ClinicalSafetyAlert.class);
        return alert != null ? alert : safeFallback("Empty mock response");
    }

    /**
     * Example workflow hook for prescription creation.
     * Returns true when the action should proceed, false when blocked by MiqorAI.
     */
    public boolean evaluatePrescriptionAttempt(ClinicalSafetyRequest request) {
        ClinicalSafetyAlert alert = checkClinicalSafety(request);
        if (alert.interventionRequired()) {
            log.warn(
                    "Blocking prescription for patientId={} reason={}",
                    request.patientRecord().patientId(),
                    alert.reasoning()
            );
            return false;
        }
        return true;
    }

    /**
     * Call this when a doctor overrides an MiqorAI alert.
     */
    public void logOverride(String doctorId, String patientId, ClinicalSafetyAlert alert, String overrideReason) {
        log.warn(
                "MiqorAI override doctorId={} patientId={} alertTitle={} severity={} reason={}",
                doctorId,
                patientId,
                alert.alertTitle(),
                alert.severity(),
                overrideReason
        );
    }

    private ClinicalSafetyAlert safeFallback(String message) {
        return new ClinicalSafetyAlert(
                "Clinical Safety Alert",
                "Review",
                message,
                "No structured search result available.",
                List.of("Review manually", "Continue only with documented reason"),
                true
        );
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record PatientRecord(
            String patientId,
            String name,
            String sex,
            String dateOfBirth,
            String bloodType,
            List<Map<String, Object>> allergies,
            List<Map<String, Object>> chronicConditions,
            @JsonProperty("current_medications_as_of_2026_06")
            List<Map<String, Object>> currentMedicationsAsOf202606
    ) {}

    public record DoctorAttemptedAction(String type, String item) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ClinicalSafetyRequest(
            PatientRecord patientRecord,
            List<Map<String, Object>> visitHistory,
            String currentComplaint,
            DoctorAttemptedAction doctorAttemptedAction
    ) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ClinicalSafetyAlert(
            String alertTitle,
            String severity,
            String reasoning,
            String aiSearchResult,
            List<String> doctorOptions,
            boolean interventionRequired
    ) {}
}
