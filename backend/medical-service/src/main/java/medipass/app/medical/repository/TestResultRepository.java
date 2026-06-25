package medipass.app.medical.repository;

import medipass.app.medical.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, UUID> {

    List<TestResult> findByVisitIdOrderByCreatedAtDesc(UUID visitId);

    List<TestResult> findByVisitIdInOrderByCreatedAtDesc(List<UUID> visitIds);
}
