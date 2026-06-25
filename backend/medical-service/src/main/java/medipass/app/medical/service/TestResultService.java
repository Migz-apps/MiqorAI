package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreateTestResultRequest;
import medipass.app.medical.dto.TestResultResponse;
import medipass.app.medical.entity.TestResult;
import medipass.app.medical.entity.TestStatus;
import medipass.app.medical.entity.Visit;
import medipass.app.medical.event.MedicalEvent;
import medipass.app.medical.exception.VisitNotFoundException;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.producer.MedicalEventProducer;
import medipass.app.medical.repository.TestResultRepository;
import medipass.app.medical.repository.VisitRepository;
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
public class TestResultService {

        private final TestResultRepository testResultRepository;
        private final VisitRepository visitRepository;
        private final MedicalEventProducer eventProducer;
        private final MedicalMapper medicalMapper;

        @Value("${rabbitmq.routing-keys.test-created:test.created}")
        private String testCreatedKey;

        @Transactional
        public TestResultResponse createTestResult(CreateTestResultRequest request) {
                Visit visit = visitRepository.findById(request.getVisitId())
                                .orElseThrow(() -> new VisitNotFoundException(
                                                "Visit not found: " + request.getVisitId()));

                TestResult testResult = TestResult.builder()
                                .visitId(request.getVisitId())
                                .hospitalId(visit.getHospitalId())
                                .doctorId(visit.getDoctorId())
                                .testName(request.getTestName())
                                .result(request.getResult())
                                .unit(request.getUnit())
                                .referenceRange(request.getReferenceRange())
                                .status(request.getStatus() != null ? request.getStatus() : TestStatus.COMPLETED)
                                .build();

                TestResult saved = testResultRepository.save(testResult);
                log.info("Test result created id={} visitId={}", saved.getId(), saved.getVisitId());

                eventProducer.publishEvent(testCreatedKey, MedicalEvent.of(
                                "test.created",
                                visit.getPatientId(),
                                Map.of(
                                                "testResultId", saved.getId().toString(),
                                                "visitId", saved.getVisitId().toString(),
                                                "testName", saved.getTestName())));

                return medicalMapper.toTestResultResponse(saved);
        }

        public List<TestResultResponse> getTestResultsByVisit(UUID visitId) {
                visitRepository.findById(visitId)
                                .orElseThrow(() -> new VisitNotFoundException("Visit not found: " + visitId));

                return testResultRepository.findByVisitIdOrderByCreatedAtDesc(visitId).stream()
                                .map(medicalMapper::toTestResultResponse)
                                .collect(Collectors.toList());
        }
}
