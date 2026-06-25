package medipass.app.integration;

import medipass.app.integration.dto.PatientExistsResponse;

import java.util.UUID;

public interface PatientClient {

    PatientExistsResponse getPatient(UUID patientId);
}
