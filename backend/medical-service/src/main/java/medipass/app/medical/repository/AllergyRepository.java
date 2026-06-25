package medipass.app.medical.repository;

import medipass.app.medical.entity.Allergy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AllergyRepository extends JpaRepository<Allergy, UUID> {

    List<Allergy> findByPatientIdOrderByRecordedAtDesc(UUID patientId);
}
