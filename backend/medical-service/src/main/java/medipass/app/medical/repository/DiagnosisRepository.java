package medipass.app.medical.repository;

import medipass.app.medical.entity.Diagnosis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiagnosisRepository extends JpaRepository<Diagnosis, UUID> {

    List<Diagnosis> findByVisitIdOrderByDiagnosedAtDesc(UUID visitId);

    List<Diagnosis> findByDoctorIdOrderByDiagnosedAtDesc(UUID doctorId);

    List<Diagnosis> findByVisitIdInOrderByDiagnosedAtDesc(List<UUID> visitIds);
}
