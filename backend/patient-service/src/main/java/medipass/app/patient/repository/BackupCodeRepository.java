package medipass.app.patient.repository;

import medipass.app.patient.entity.BackupCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BackupCodeRepository extends JpaRepository<BackupCode, UUID> {

    List<BackupCode> findByPatientId(UUID patientId);

    List<BackupCode> findByPatientIdAndUsedFalse(UUID patientId);

    void deleteByPatientId(UUID patientId);
}
