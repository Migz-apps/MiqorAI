package medipass.app.medical.repository;

import medipass.app.medical.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, UUID> {

    Optional<Hospital> findByHospitalCode(String hospitalCode);

    boolean existsByHospitalCode(String hospitalCode);

    boolean existsByEmail(String email);

    java.util.List<Hospital> findByIsActiveTrueOrderByCreatedAtDesc();
}
