package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreateDiagnosisRequest;
import medipass.app.medical.dto.DiagnosisResponse;
import medipass.app.medical.entity.Diagnosis;
import medipass.app.medical.exception.InvalidMedicalDataException;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.repository.DiagnosisRepository;
import medipass.app.medical.repository.VisitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiagnosisService {

    private final DiagnosisRepository diagnosisRepository;
    private final VisitRepository visitRepository;
    private final DoctorService doctorService;
    private final MedicalMapper medicalMapper;

    @Transactional
    public DiagnosisResponse createDiagnosis(CreateDiagnosisRequest request) {
        visitRepository.findById(request.getVisitId())
                .orElseThrow(() -> new InvalidMedicalDataException("Visit not found: " + request.getVisitId()));
        doctorService.validateDoctorExists(request.getDoctorId());

        Diagnosis diagnosis = Diagnosis.builder()
                .visitId(request.getVisitId())
                .doctorId(request.getDoctorId())
                .diagnosisName(request.getDiagnosisName())
                .diagnosisNotes(request.getDiagnosisNotes())
                .build();

        Diagnosis saved = diagnosisRepository.save(diagnosis);
        log.info("Diagnosis created id={} visitId={}", saved.getId(), saved.getVisitId());
        return medicalMapper.toDiagnosisResponse(saved);
    }

    public List<DiagnosisResponse> getDiagnosesByVisit(UUID visitId) {
        visitRepository.findById(visitId)
                .orElseThrow(() -> new InvalidMedicalDataException("Visit not found: " + visitId));
        return diagnosisRepository.findByVisitIdOrderByDiagnosedAtDesc(visitId).stream()
                .map(medicalMapper::toDiagnosisResponse)
                .collect(Collectors.toList());
    }

    public List<DiagnosisResponse> getDiagnosesByDoctor(UUID doctorId) {
        doctorService.validateDoctorExists(doctorId);
        return diagnosisRepository.findByDoctorIdOrderByDiagnosedAtDesc(doctorId).stream()
                .map(medicalMapper::toDiagnosisResponse)
                .collect(Collectors.toList());
    }
}
