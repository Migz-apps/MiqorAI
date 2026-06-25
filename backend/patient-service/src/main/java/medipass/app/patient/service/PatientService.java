package medipass.app.patient.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.PatientResponse;
import medipass.app.patient.dto.RegisterPatientRequest;
import medipass.app.patient.dto.UpdatePatientRequest;
import medipass.app.patient.entity.Patient;
import medipass.app.patient.exception.InvalidPatientDataException;
import medipass.app.patient.exception.PatientAlreadyExistsException;
import medipass.app.patient.exception.PatientNotFoundException;
import medipass.app.patient.mapper.PatientMapper;
import medipass.app.patient.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;
    private final QRCodeService qrCodeService;

    @Transactional
    public PatientResponse registerPatient(RegisterPatientRequest request) {
        // Uniqueness checks
        if (patientRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new PatientAlreadyExistsException(
                    "Patient with phone number " + request.getPhoneNumber() + " already exists"
            );
        }
        if (patientRepository.existsByNationalId(request.getNationalId())) {
            throw new PatientAlreadyExistsException(
                    "Patient with national ID already exists"
            );
        }

        // Age validation — must be realistic (not older than 150 years)
        validateDateOfBirth(request.getDateOfBirth());

        Patient patient = Patient.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .gender(request.getGender())
                .phoneNumber(request.getPhoneNumber())
                .nationalId(request.getNationalId())
                .dateOfBirth(request.getDateOfBirth())
                .bloodGroup(request.getBloodGroup())
                .maritalStatus(request.getMaritalStatus())
                .isActive(true)
                .build();

        Patient saved = patientRepository.save(patient);

        // Generate initial QR hash
        String qrHash = qrCodeService.generateQRHash(saved.getId());
        saved.setQrCodeHash(qrHash);
        saved = patientRepository.save(saved);

        log.info("Patient registered with id={}", saved.getId());
        return patientMapper.toPatientResponse(saved);
    }

    public PatientResponse getPatient(UUID patientId) {
        Patient patient = findActivePatient(patientId);
        return patientMapper.toPatientResponse(patient);
    }

    @Transactional
    public PatientResponse updatePatient(UUID patientId, UpdatePatientRequest request) {
        Patient patient = findActivePatient(patientId);

        // Phone uniqueness check (only if changing)
        if (request.getPhoneNumber() != null
                && !request.getPhoneNumber().equals(patient.getPhoneNumber())
                && patientRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new PatientAlreadyExistsException(
                    "Phone number " + request.getPhoneNumber() + " is already in use"
            );
        }

        if (request.getFirstName() != null) patient.setFirstName(request.getFirstName());
        if (request.getLastName() != null) patient.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) patient.setPhoneNumber(request.getPhoneNumber());
        if (request.getBloodGroup() != null) patient.setBloodGroup(request.getBloodGroup());
        if (request.getMaritalStatus() != null) patient.setMaritalStatus(request.getMaritalStatus());
        if (request.getProfilePictureUrl() != null) patient.setProfilePictureUrl(request.getProfilePictureUrl());

        Patient updated = patientRepository.save(patient);
        log.info("Patient updated id={}", patientId);
        return patientMapper.toPatientResponse(updated);
    }

    @Transactional
    public void deletePatient(UUID patientId) {
        Patient patient = findActivePatient(patientId);
        patient.setIsActive(false);
        patientRepository.save(patient);
        log.info("Patient soft-deleted id={}", patientId);
    }

    public List<PatientResponse> searchPatients(String query) {
        if (query == null || query.isBlank()) {
            throw new InvalidPatientDataException("Search query cannot be empty");
        }
        log.info("Patient search executed");
        return patientRepository.searchPatients(query.trim()).stream()
                .map(patientMapper::toPatientResponse)
                .collect(Collectors.toList());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Patient findActivePatient(UUID patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found: " + patientId));
        if (!Boolean.TRUE.equals(patient.getIsActive())) {
            throw new PatientNotFoundException("Patient not found: " + patientId);
        }
        return patient;
    }

    private void validateDateOfBirth(LocalDate dob) {
        if (dob.isAfter(LocalDate.now())) {
            throw new InvalidPatientDataException("Date of birth cannot be in the future");
        }
        if (dob.isBefore(LocalDate.now().minusYears(150))) {
            throw new InvalidPatientDataException("Date of birth is not realistic");
        }
    }
}
