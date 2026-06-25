package medipass.app.medical.repository;

import medipass.app.medical.entity.MedicalHistorySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalHistoryRepository extends JpaRepository<MedicalHistorySnapshot, UUID> {

    Optional<MedicalHistorySnapshot> findByPatientId(UUID patientId);
}
