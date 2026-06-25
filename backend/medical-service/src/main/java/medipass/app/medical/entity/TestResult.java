package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "test_results", schema = "medical_schema", indexes = {
        @Index(name = "idx_test_result_visit_id", columnList = "visit_id"),
        @Index(name = "idx_test_result_hospital_id", columnList = "hospital_id"),
        @Index(name = "idx_test_result_doctor_id", columnList = "doctor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "visit_id", nullable = false)
    private UUID visitId;

    @Column(name = "hospital_id", nullable = false)
    private UUID hospitalId;

    @Column(name = "doctor_id", nullable = false)
    private UUID doctorId;

    @Column(name = "test_name", nullable = false, length = 200)
    private String testName;

    @Column(name = "result", nullable = false, columnDefinition = "TEXT")
    private String result;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "reference_range", length = 100)
    private String referenceRange;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private TestStatus status = TestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
