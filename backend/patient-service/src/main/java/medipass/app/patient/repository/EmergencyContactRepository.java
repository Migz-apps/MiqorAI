package medipass.app.patient.repository;

import medipass.app.patient.entity.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {

    List<EmergencyContact> findByPatientId(UUID patientId);

    boolean existsByPatientIdAndPhoneNumber(UUID patientId, String phoneNumber);
}
