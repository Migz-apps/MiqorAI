package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreateDoctorRequest;
import medipass.app.medical.dto.DoctorResponse;
import medipass.app.medical.dto.UpdateDoctorRequest;
import medipass.app.medical.entity.Doctor;
import medipass.app.medical.exception.DoctorNotFoundException;
import medipass.app.medical.exception.InvalidMedicalDataException;
import medipass.app.medical.repository.DoctorRepository;
import medipass.app.medical.mapper.MedicalMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final HospitalService hospitalService;
    private final MedicalMapper medicalMapper;

    @Transactional
    public DoctorResponse createDoctor(CreateDoctorRequest request) {
        hospitalService.validateHospitalActive(request.getHospitalId());

        if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new InvalidMedicalDataException(
                    "Doctor license number already exists: " + request.getLicenseNumber());
        }
        if (doctorRepository.existsByEmail(request.getEmail())) {
            throw new InvalidMedicalDataException("Doctor email already exists: " + request.getEmail());
        }

        Doctor doctor = Doctor.builder()
                .hospitalId(request.getHospitalId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .specialization(request.getSpecialization())
                .licenseNumber(request.getLicenseNumber())
                .isActive(true)
                .build();

        Doctor saved = doctorRepository.save(doctor);
        log.info("Doctor created id={} hospitalId={} license={}", saved.getId(), saved.getHospitalId(),
                saved.getLicenseNumber());
        return medicalMapper.toDoctorResponse(saved);
    }

    public List<DoctorResponse> getDoctorsByHospital(UUID hospitalId) {
        hospitalService.validateHospitalActive(hospitalId);
        return doctorRepository.findByHospitalIdAndIsActiveTrueOrderByCreatedAtDesc(hospitalId).stream()
                .map(medicalMapper::toDoctorResponse)
                .collect(Collectors.toList());
    }

    public DoctorResponse getDoctor(UUID doctorId) {
        return medicalMapper.toDoctorResponse(validateDoctorExists(doctorId));
    }

    @Transactional
    public DoctorResponse updateDoctor(UUID doctorId, UpdateDoctorRequest request) {
        Doctor doctor = validateDoctorExists(doctorId);
        hospitalService.validateHospitalActive(request.getHospitalId());

        if (!doctor.getLicenseNumber().equalsIgnoreCase(request.getLicenseNumber())
                && doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new InvalidMedicalDataException(
                    "Doctor license number already exists: " + request.getLicenseNumber());
        }
        if (!doctor.getEmail().equalsIgnoreCase(request.getEmail())
                && doctorRepository.existsByEmail(request.getEmail())) {
            throw new InvalidMedicalDataException("Doctor email already exists: " + request.getEmail());
        }

        doctor.setHospitalId(request.getHospitalId());
        doctor.setFirstName(request.getFirstName());
        doctor.setLastName(request.getLastName());
        doctor.setEmail(request.getEmail());
        doctor.setPhoneNumber(request.getPhoneNumber());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setLicenseNumber(request.getLicenseNumber());
        if (request.getIsActive() != null) {
            doctor.setIsActive(request.getIsActive());
        }

        Doctor updated = doctorRepository.save(doctor);
        log.info("Doctor updated id={} hospitalId={}", updated.getId(), updated.getHospitalId());
        return medicalMapper.toDoctorResponse(updated);
    }

    @Transactional
    public void softDeleteDoctor(UUID doctorId) {
        Doctor doctor = validateDoctorExists(doctorId);
        doctor.setIsActive(false);
        doctorRepository.save(doctor);
        log.info("Doctor soft deleted id={}", doctorId);
    }

    public Doctor validateDoctorExists(UUID doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new DoctorNotFoundException("Doctor not found: " + doctorId));
    }

    public Doctor validateActiveDoctorBelongsToHospital(UUID doctorId, UUID hospitalId) {
        Doctor doctor = doctorRepository.findByIdAndIsActiveTrue(doctorId)
                .orElseThrow(() -> new DoctorNotFoundException("Doctor not found or inactive: " + doctorId));
        if (!doctor.getHospitalId().equals(hospitalId)) {
            throw new InvalidMedicalDataException("Doctor does not belong to the selected hospital");
        }
        return doctor;
    }
}
