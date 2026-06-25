package medipass.app.medical.repository;

import medipass.app.medical.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    List<Prescription> findByVisitIdOrderByCreatedAtDesc(UUID visitId);

    List<Prescription> findByVisitIdInOrderByCreatedAtDesc(List<UUID> visitIds);
}
