package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreatePrescriptionRequest;
import medipass.app.medical.dto.PrescriptionResponse;
import medipass.app.medical.entity.Prescription;
import medipass.app.medical.entity.Visit;
import medipass.app.medical.event.MedicalEvent;
import medipass.app.medical.exception.VisitNotFoundException;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.producer.MedicalEventProducer;
import medipass.app.medical.repository.PrescriptionRepository;
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
public class PrescriptionService {

        private final PrescriptionRepository prescriptionRepository;
        private final VisitRepository visitRepository;
        private final MedicalEventProducer eventProducer;
        private final MedicalMapper medicalMapper;

        @Value("${rabbitmq.routing-keys.prescription-created:prescription.created}")
        private String prescriptionCreatedKey;

        @Transactional
        public PrescriptionResponse createPrescription(CreatePrescriptionRequest request) {
                Visit visit = visitRepository.findById(request.getVisitId())
                                .orElseThrow(() -> new VisitNotFoundException(
                                                "Visit not found: " + request.getVisitId()));

                Prescription prescription = Prescription.builder()
                                .visitId(request.getVisitId())
                                .hospitalId(visit.getHospitalId())
                                .doctorId(visit.getDoctorId())
                                .medicationName(request.getMedicationName())
                                .dosage(request.getDosage())
                                .frequency(request.getFrequency())
                                .duration(request.getDuration())
                                .instructions(request.getInstructions())
                                .build();

                Prescription saved = prescriptionRepository.save(prescription);
                log.info("Prescription created id={} visitId={}", saved.getId(), saved.getVisitId());

                eventProducer.publishEvent(prescriptionCreatedKey, MedicalEvent.of(
                                "prescription.created",
                                visit.getPatientId(),
                                Map.of(
                                                "prescriptionId", saved.getId().toString(),
                                                "visitId", saved.getVisitId().toString(),
                                                "medication", saved.getMedicationName())));

                return medicalMapper.toPrescriptionResponse(saved);
        }

        public List<PrescriptionResponse> getPrescriptionsByVisit(UUID visitId) {
                visitRepository.findById(visitId)
                                .orElseThrow(() -> new VisitNotFoundException("Visit not found: " + visitId));

                return prescriptionRepository.findByVisitIdOrderByCreatedAtDesc(visitId).stream()
                                .map(medicalMapper::toPrescriptionResponse)
                                .collect(Collectors.toList());
        }
}
