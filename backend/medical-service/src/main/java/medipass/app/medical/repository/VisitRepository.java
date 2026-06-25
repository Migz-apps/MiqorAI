package medipass.app.medical.repository;

import medipass.app.medical.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisitRepository extends JpaRepository<Visit, UUID> {

    List<Visit> findByPatientIdOrderByVisitDateDesc(UUID patientId);

    List<Visit> findByDoctorIdOrderByVisitDateDesc(UUID doctorId);

    List<Visit> findByHospitalIdOrderByVisitDateDesc(UUID hospitalId);
}
