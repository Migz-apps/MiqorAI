package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.AddAllergyRequest;
import medipass.app.medical.dto.AllergyResponse;
import medipass.app.medical.entity.Allergy;
import medipass.app.medical.event.MedicalEvent;
import medipass.app.medical.exception.PatientNotFoundException;
import medipass.app.integration.PatientClient;
import medipass.app.integration.dto.PatientExistsResponse;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.producer.MedicalEventProducer;
import medipass.app.medical.repository.AllergyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AllergyService {

    private final AllergyRepository allergyRepository;
    private final PatientClient patientClient;
    private final MedicalEventProducer eventProducer;
    private final MedicalMapper medicalMapper;

    @Value("${rabbitmq.routing-keys.allergy-recorded:allergy.recorded}")
    private String allergyRecordedKey;

    @Transactional
    public AllergyResponse addAllergy(AddAllergyRequest request) {
        validatePatientExists(request.getPatientId());

        Allergy allergy = Allergy.builder()
                .patientId(request.getPatientId())
                .allergyName(request.getAllergyName())
                .severity(request.getSeverity())
                .reaction(request.getReaction())
                .build();

        Allergy saved = allergyRepository.save(allergy);
        log.info("Allergy recorded id={} patientId={}", saved.getId(), saved.getPatientId());

        eventProducer.publishEvent(allergyRecordedKey, MedicalEvent.of(
                "allergy.recorded",
                saved.getPatientId(),
                Map.of(
                    "allergyId", saved.getId().toString(),
                    "allergyName", saved.getAllergyName(),
                    "severity", saved.getSeverity().name()
                )
        ));

        return medicalMapper.toAllergyResponse(saved);
    }

    public List<AllergyResponse> getAllergiesByPatient(UUID patientId) {
        return allergyRepository.findByPatientIdOrderByRecordedAtDesc(patientId).stream()
                .map(medicalMapper::toAllergyResponse)
                .collect(Collectors.toList());
    }

    private void validatePatientExists(UUID patientId) {
        try {
            PatientExistsResponse response = patientClient.getPatient(patientId);
            if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
                throw new PatientNotFoundException("Patient not found: " + patientId);
            }
        } catch (PatientNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to validate patient {}: {}", patientId, ex.getMessage());
            throw new PatientNotFoundException("Unable to verify patient: " + patientId);
        }
    }
}
