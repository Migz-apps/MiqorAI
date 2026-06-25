package medipass.app.patient.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.EmergencyContactRequest;
import medipass.app.patient.dto.EmergencyContactResponse;
import medipass.app.patient.entity.EmergencyContact;
import medipass.app.patient.exception.DuplicateEmergencyContactException;
import medipass.app.patient.exception.PatientNotFoundException;
import medipass.app.patient.mapper.PatientMapper;
import medipass.app.patient.repository.EmergencyContactRepository;
import medipass.app.patient.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyContactService {

    private final EmergencyContactRepository emergencyContactRepository;
    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    @Transactional
    public EmergencyContactResponse addEmergencyContact(UUID patientId, EmergencyContactRequest request) {
        // Verify patient exists
        patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found: " + patientId));

        // Check for duplicate contact by phone number
        if (emergencyContactRepository.existsByPatientIdAndPhoneNumber(patientId, request.getPhoneNumber())) {
            throw new DuplicateEmergencyContactException(
                    "Emergency contact with phone number " + request.getPhoneNumber() + " already exists for this patient"
            );
        }

        EmergencyContact contact = EmergencyContact.builder()
                .patientId(patientId)
                .fullName(request.getFullName())
                .relationship(request.getRelationship())
                .phoneNumber(request.getPhoneNumber())
                .build();

        EmergencyContact saved = emergencyContactRepository.save(contact);
        log.info("Emergency contact added for patientId={}", patientId);
        return patientMapper.toEmergencyContactResponse(saved);
    }

    public List<EmergencyContactResponse> getEmergencyContacts(UUID patientId) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found: " + patientId));

        return emergencyContactRepository.findByPatientId(patientId).stream()
                .map(patientMapper::toEmergencyContactResponse)
                .collect(Collectors.toList());
    }
}
