package medipass.app.medical.repository;

import medipass.app.medical.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    List<Doctor> findByHospitalIdAndIsActiveTrueOrderByCreatedAtDesc(UUID hospitalId);

    Optional<Doctor> findByLicenseNumber(String licenseNumber);

    boolean existsByLicenseNumber(String licenseNumber);

    boolean existsByEmail(String email);

    Optional<Doctor> findByIdAndIsActiveTrue(UUID id);
}
