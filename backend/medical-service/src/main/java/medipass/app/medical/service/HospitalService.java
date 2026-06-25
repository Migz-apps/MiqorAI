package medipass.app.medical.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.medical.dto.CreateHospitalRequest;
import medipass.app.medical.dto.HospitalResponse;
import medipass.app.medical.dto.UpdateHospitalRequest;
import medipass.app.medical.entity.Hospital;
import medipass.app.medical.exception.HospitalNotFoundException;
import medipass.app.medical.exception.InvalidMedicalDataException;
import medipass.app.medical.repository.HospitalRepository;
import medipass.app.medical.mapper.MedicalMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalService {

    private final HospitalRepository hospitalRepository;
    private final MedicalMapper medicalMapper;

    @Transactional
    public HospitalResponse createHospital(CreateHospitalRequest request) {
        if (hospitalRepository.existsByHospitalCode(request.getHospitalCode())) {
            throw new InvalidMedicalDataException("Hospital code already exists: " + request.getHospitalCode());
        }
        if (hospitalRepository.existsByEmail(request.getEmail())) {
            throw new InvalidMedicalDataException("Hospital email already exists: " + request.getEmail());
        }

        Hospital hospital = Hospital.builder()
                .hospitalCode(request.getHospitalCode())
                .hospitalName(request.getHospitalName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .district(request.getDistrict())
                .sector(request.getSector())
                .isActive(true)
                .build();

        Hospital saved = hospitalRepository.save(hospital);
        log.info("Hospital created id={} code={}", saved.getId(), saved.getHospitalCode());
        return medicalMapper.toHospitalResponse(saved);
    }

    public List<HospitalResponse> getAllHospitals() {
        return hospitalRepository.findByIsActiveTrueOrderByCreatedAtDesc().stream()
                .map(medicalMapper::toHospitalResponse)
                .collect(Collectors.toList());
    }

    public HospitalResponse getHospitalById(UUID hospitalId) {
        return medicalMapper.toHospitalResponse(validateHospitalExists(hospitalId));
    }

    @Transactional
    public HospitalResponse updateHospital(UUID hospitalId, UpdateHospitalRequest request) {
        Hospital hospital = validateHospitalExists(hospitalId);

        if (!hospital.getHospitalCode().equalsIgnoreCase(request.getHospitalCode())
                && hospitalRepository.existsByHospitalCode(request.getHospitalCode())) {
            throw new InvalidMedicalDataException("Hospital code already exists: " + request.getHospitalCode());
        }
        if (!hospital.getEmail().equalsIgnoreCase(request.getEmail())
                && hospitalRepository.existsByEmail(request.getEmail())) {
            throw new InvalidMedicalDataException("Hospital email already exists: " + request.getEmail());
        }

        hospital.setHospitalCode(request.getHospitalCode());
        hospital.setHospitalName(request.getHospitalName());
        hospital.setEmail(request.getEmail());
        hospital.setPhoneNumber(request.getPhoneNumber());
        hospital.setAddress(request.getAddress());
        hospital.setDistrict(request.getDistrict());
        hospital.setSector(request.getSector());
        if (request.getIsActive() != null) {
            hospital.setIsActive(request.getIsActive());
        }

        Hospital updated = hospitalRepository.save(hospital);
        log.info("Hospital updated id={} code={}", updated.getId(), updated.getHospitalCode());
        return medicalMapper.toHospitalResponse(updated);
    }

    @Transactional
    public void softDeleteHospital(UUID hospitalId) {
        Hospital hospital = validateHospitalExists(hospitalId);
        hospital.setIsActive(false);
        hospitalRepository.save(hospital);
        log.info("Hospital soft deleted id={}", hospitalId);
    }

    public Hospital validateHospitalExists(UUID hospitalId) {
        return hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new HospitalNotFoundException("Hospital not found: " + hospitalId));
    }

    public Hospital validateHospitalActive(UUID hospitalId) {
        Hospital hospital = validateHospitalExists(hospitalId);
        if (!Boolean.TRUE.equals(hospital.getIsActive())) {
            throw new InvalidMedicalDataException("Hospital is not active: " + hospitalId);
        }
        return hospital;
    }
}
