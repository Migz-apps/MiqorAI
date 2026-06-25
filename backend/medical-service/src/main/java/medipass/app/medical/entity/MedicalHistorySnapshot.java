package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "medical_history_snapshot",
    schema = "medical_schema",
    indexes = @Index(name = "idx_history_patient_id", columnList = "patient_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalHistorySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "patient_id", nullable = false, unique = true)
    private UUID patientId;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
