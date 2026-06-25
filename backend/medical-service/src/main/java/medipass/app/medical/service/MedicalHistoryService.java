package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.AllergyResponse;
import medipass.app.medical.dto.DiagnosisResponse;
import medipass.app.medical.dto.DoctorResponse;
import medipass.app.medical.dto.HospitalResponse;
import medipass.app.medical.dto.MedicalHistoryResponse;
import medipass.app.medical.dto.PatientContinuitySummaryResponse;
import medipass.app.medical.dto.PrescriptionResponse;
import medipass.app.medical.dto.TestResultResponse;
import medipass.app.medical.dto.VisitResponse;
import medipass.app.medical.entity.Diagnosis;
import medipass.app.medical.entity.MedicalHistorySnapshot;
import medipass.app.medical.entity.Prescription;
import medipass.app.medical.entity.TestResult;
import medipass.app.medical.entity.Visit;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.repository.AllergyRepository;
import medipass.app.medical.repository.DiagnosisRepository;
import medipass.app.medical.repository.DoctorRepository;
import medipass.app.medical.repository.HospitalRepository;
import medipass.app.medical.repository.MedicalHistoryRepository;
import medipass.app.medical.repository.PrescriptionRepository;
import medipass.app.medical.repository.TestResultRepository;
import medipass.app.medical.repository.VisitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalHistoryService {

        private final VisitRepository visitRepository;
        private final HospitalRepository hospitalRepository;
        private final DoctorRepository doctorRepository;
        private final DiagnosisRepository diagnosisRepository;
        private final PrescriptionRepository prescriptionRepository;
        private final TestResultRepository testResultRepository;
        private final AllergyRepository allergyRepository;
        private final MedicalHistoryRepository medicalHistoryRepository;
        private final MedicalMapper medicalMapper;

        /**
         * Aggregates the full medical history for a patient:
         * all visits (newest first), all allergies, and the stored summary snapshot.
         */
        @Transactional
        public MedicalHistoryResponse getPatientHistory(UUID patientId) {
                List<VisitResponse> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId).stream()
                                .map(medicalMapper::toVisitResponse)
                                .collect(Collectors.toList());

                List<AllergyResponse> allergies = allergyRepository.findByPatientIdOrderByRecordedAtDesc(patientId)
                                .stream()
                                .map(medicalMapper::toAllergyResponse)
                                .collect(Collectors.toList());

                // Build or refresh the snapshot
                String summary = buildSummary(patientId, visits.size(), allergies.size());
                MedicalHistorySnapshot snapshot = medicalHistoryRepository.findByPatientId(patientId)
                                .orElse(MedicalHistorySnapshot.builder().patientId(patientId).build());
                snapshot.setSummary(summary);
                snapshot.setLastUpdated(LocalDateTime.now());
                medicalHistoryRepository.save(snapshot);

                log.info("Medical history retrieved for patientId={}", patientId);

                return MedicalHistoryResponse.builder()
                                .patientId(patientId)
                                .summary(summary)
                                .lastUpdated(snapshot.getLastUpdated())
                                .visits(visits)
                                .allergies(allergies)
                                .totalVisits(visits.size())
                                .totalAllergies(allergies.size())
                                .build();
        }

        public PatientContinuitySummaryResponse getPatientContinuitySummary(UUID patientId) {
                List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
                List<VisitResponse> visitResponses = visits.stream()
                                .map(medicalMapper::toVisitResponse)
                                .collect(Collectors.toList());

                Set<UUID> hospitalIds = visits.stream()
                                .map(Visit::getHospitalId)
                                .collect(Collectors.toCollection(HashSet::new));

                Set<UUID> doctorIds = visits.stream()
                                .map(Visit::getDoctorId)
                                .collect(Collectors.toCollection(HashSet::new));

                List<HospitalResponse> hospitals = hospitalRepository.findAllById(hospitalIds).stream()
                                .map(medicalMapper::toHospitalResponse)
                                .collect(Collectors.toList());

                List<DoctorResponse> doctors = doctorRepository.findAllById(doctorIds).stream()
                                .map(medicalMapper::toDoctorResponse)
                                .collect(Collectors.toList());

                List<UUID> visitIds = visits.stream().map(Visit::getId).collect(Collectors.toList());
                List<Diagnosis> diagnoses = visitIds.isEmpty() ? List.of()
                                : diagnosisRepository.findByVisitIdInOrderByDiagnosedAtDesc(visitIds);
                List<Prescription> prescriptions = visitIds.isEmpty() ? List.of()
                                : prescriptionRepository.findByVisitIdInOrderByCreatedAtDesc(visitIds);
                List<TestResult> testResults = visitIds.isEmpty() ? List.of()
                                : testResultRepository.findByVisitIdInOrderByCreatedAtDesc(visitIds);

                List<DiagnosisResponse> diagnosisResponses = diagnoses.stream()
                                .map(medicalMapper::toDiagnosisResponse)
                                .collect(Collectors.toList());

                List<PrescriptionResponse> prescriptionResponses = prescriptions.stream()
                                .map(medicalMapper::toPrescriptionResponse)
                                .collect(Collectors.toList());

                List<TestResultResponse> testResultResponses = testResults.stream()
                                .map(medicalMapper::toTestResultResponse)
                                .collect(Collectors.toList());

                String summary = String.format(
                                "Patient %s has %d visit(s) across %d hospital(s) and %d doctor(s).",
                                patientId,
                                visits.size(),
                                hospitals.size(),
                                doctors.size());

                return PatientContinuitySummaryResponse.builder()
                                .patientId(patientId)
                                .summary(summary)
                                .lastUpdated(LocalDateTime.now())
                                .totalVisits(visits.size())
                                .totalHospitalsVisited(hospitals.size())
                                .totalDoctorsSeen(doctors.size())
                                .totalDiagnoses(diagnoses.size())
                                .totalPrescriptions(prescriptions.size())
                                .totalTests(testResults.size())
                                .hospitalsVisited(hospitals)
                                .doctorsSeen(doctors)
                                .recentVisits(visitResponses.stream().limit(5).collect(Collectors.toList()))
                                .recentDiagnoses(diagnosisResponses.stream().limit(5).collect(Collectors.toList()))
                                .recentPrescriptions(
                                                prescriptionResponses.stream().limit(5).collect(Collectors.toList()))
                                .recentTests(testResultResponses.stream().limit(5).collect(Collectors.toList()))
                                .build();
        }

        private String buildSummary(UUID patientId, int visitCount, int allergyCount) {
                return String.format(
                                "Patient %s has %d recorded visit(s) and %d known allerg%s.",
                                patientId,
                                visitCount,
                                allergyCount,
                                allergyCount == 1 ? "y" : "ies");
        }
}
