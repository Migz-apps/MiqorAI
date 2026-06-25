package medipass.app.patient.repository;

import medipass.app.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByPhoneNumber(String phoneNumber);

    Optional<Patient> findByNationalId(String nationalId);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByNationalId(String nationalId);

    @Query("""
        SELECT p FROM Patient p
        WHERE p.isActive = true
        AND (
            LOWER(p.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.lastName) LIKE LOWER(CONCAT('%', :query, '%'))
            OR p.phoneNumber LIKE CONCAT('%', :query, '%')
            OR p.nationalId LIKE CONCAT('%', :query, '%')
        )
        """)
    List<Patient> searchPatients(@Param("query") String query);
}
