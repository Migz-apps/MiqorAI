package medipass.app.integration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.integration.dto.PatientExistsResponse;
import medipass.common.dto.ApiResponse;
import medipass.common.security.JwtTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class HttpPatientClient implements PatientClient {

    private static final String SYSTEM_ACTOR = "system@medipass.internal";
    private static final String SYSTEM_ROLE = "ADMIN";

    private final RestClient restClient;
    private final JwtTokenService jwtTokenService;

    @Value("${services.patient.url}")
    private String patientServiceUrl;

    @Override
    public PatientExistsResponse getPatient(UUID patientId) {
        String token = jwtTokenService.generateAccessToken(SYSTEM_ACTOR, SYSTEM_ROLE);
        try {
            ApiResponse<PatientApiData> response = restClient.get()
                    .uri(patientServiceUrl + "/api/v1/patients/{patientId}", patientId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<PatientApiData>>() {});

            return mapResponse(response);
        } catch (HttpClientErrorException.NotFound ex) {
            PatientExistsResponse notFound = new PatientExistsResponse();
            notFound.setSuccess(false);
            notFound.setMessage("Patient not found: " + patientId);
            return notFound;
        } catch (Exception ex) {
            log.error("Failed to call patient-service for patientId={}: {}", patientId, ex.getMessage());
            PatientExistsResponse error = new PatientExistsResponse();
            error.setSuccess(false);
            error.setMessage("Unable to reach patient service");
            return error;
        }
    }

    private PatientExistsResponse mapResponse(ApiResponse<PatientApiData> response) {
        PatientExistsResponse result = new PatientExistsResponse();
        if (response == null) {
            result.setSuccess(false);
            result.setMessage("Empty response from patient service");
            return result;
        }
        result.setSuccess(response.getSuccess());
        result.setMessage(response.getMessage());
        if (response.getData() != null) {
            PatientExistsResponse.PatientData data = new PatientExistsResponse.PatientData();
            data.setId(response.getData().id());
            data.setFirstName(response.getData().firstName());
            data.setLastName(response.getData().lastName());
            data.setActive(response.getData().active());
            result.setData(data);
        }
        return result;
    }

    private record PatientApiData(UUID id, String firstName, String lastName, Boolean active) {
    }
}
