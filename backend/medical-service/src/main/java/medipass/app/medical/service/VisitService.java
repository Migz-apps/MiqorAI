package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreateDiagnosisRequest;
import medipass.app.medical.dto.CreateVisitRequest;
import medipass.app.medical.dto.VisitResponse;
import medipass.app.medical.entity.Visit;
import medipass.app.medical.entity.VisitStatus;
import medipass.app.medical.event.MedicalEvent;
import medipass.app.medical.exception.PatientNotFoundException;
import medipass.app.medical.exception.VisitNotFoundException;
import medipass.app.integration.PatientClient;
import medipass.app.integration.dto.PatientExistsResponse;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.producer.MedicalEventProducer;
import medipass.app.medical.repository.VisitRepository;
import medipass.app.medical.service.DoctorService;
import medipass.app.medical.service.DiagnosisService;
import medipass.app.medical.service.HospitalService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitService {

    private final VisitRepository visitRepository;
    private final PatientClient patientClient;
    private final MedicalEventProducer eventProducer;
    private final MedicalMapper medicalMapper;
    private final HospitalService hospitalService;
    private final DoctorService doctorService;
    private final DiagnosisService diagnosisService;

    @Value("${rabbitmq.routing-keys.visit-created:visit.created}")
    private String visitCreatedKey;

    @Transactional
    public VisitResponse createVisit(CreateVisitRequest request) {
        // 1. Validate patient exists via OpenFeign
        validatePatientExists(request.getPatientId());
        // 2. Validate hospital and doctor relationship
        hospitalService.validateHospitalActive(request.getHospitalId());
        doctorService.validateActiveDoctorBelongsToHospital(request.getDoctorId(), request.getHospitalId());

        // 3. Build and save visit
        Visit visit = Visit.builder()
                .patientId(request.getPatientId())
                .hospitalId(request.getHospitalId())
                .doctorId(request.getDoctorId())
                .visitReason(request.getVisitReason())
                .diagnosis(request.getDiagnosis())
                .notes(request.getNotes())
                .status(request.getStatus() != null ? request.getStatus() : VisitStatus.ONGOING)
                .visitDate(request.getVisitDate() != null ? request.getVisitDate() : LocalDateTime.now())
                .build();

        Visit saved = visitRepository.save(visit);
        log.info("Visit created id={} patientId={}", saved.getId(), saved.getPatientId());

        if (saved.getDiagnosis() != null && !saved.getDiagnosis().isBlank()) {
            diagnosisService.createDiagnosis(CreateDiagnosisRequest.builder()
                    .visitId(saved.getId())
                    .doctorId(saved.getDoctorId())
                    .diagnosisName(saved.getDiagnosis())
                    .diagnosisNotes(saved.getNotes())
                    .build());
        }

        // 3. Publish event
        eventProducer.publishEvent(visitCreatedKey, MedicalEvent.of(
                "visit.created",
                saved.getPatientId(),
                Map.of("visitId", saved.getId().toString(), "hospitalId", saved.getHospitalId())));

        return medicalMapper.toVisitResponse(saved);
    }

    public List<VisitResponse> getVisitsByPatient(UUID patientId) {
        return visitRepository.findByPatientIdOrderByVisitDateDesc(patientId).stream()
                .map(medicalMapper::toVisitResponse)
                .collect(Collectors.toList());
    }

    public List<VisitResponse> getVisitsByHospital(UUID hospitalId) {
        hospitalService.validateHospitalExists(hospitalId);
        return visitRepository.findByHospitalIdOrderByVisitDateDesc(hospitalId).stream()
                .map(medicalMapper::toVisitResponse)
                .collect(Collectors.toList());
    }

    public List<VisitResponse> getVisitsByDoctor(UUID doctorId) {
        doctorService.validateDoctorExists(doctorId);
        return visitRepository.findByDoctorIdOrderByVisitDateDesc(doctorId).stream()
                .map(medicalMapper::toVisitResponse)
                .collect(Collectors.toList());
    }

    public VisitResponse getVisit(UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new VisitNotFoundException("Visit not found: " + visitId));
        return medicalMapper.toVisitResponse(visit);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void validatePatientExists(UUID patientId) {
        try {
            PatientExistsResponse response = patientClient.getPatient(patientId);
            if (response == null || !Boolean.TRUE.equals(response.getSuccess())
                    || response.getData() == null
                    || !Boolean.TRUE.equals(response.getData().getActive())) {
                throw new PatientNotFoundException("Patient not found or inactive: " + patientId);
            }
        } catch (PatientNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to validate patient {}: {}", patientId, ex.getMessage());
            throw new PatientNotFoundException("Unable to verify patient: " + patientId);
        }
    }
}
