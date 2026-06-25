package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "diagnoses", schema = "medical_schema", indexes = {
        @Index(name = "idx_diagnosis_visit_id", columnList = "visit_id"),
        @Index(name = "idx_diagnosis_doctor_id", columnList = "doctor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Diagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "visit_id", nullable = false)
    private UUID visitId;

    @Column(name = "doctor_id", nullable = false)
    private UUID doctorId;

    @Column(name = "diagnosis_name", nullable = false, length = 200)
    private String diagnosisName;

    @Column(name = "diagnosis_notes", columnDefinition = "TEXT")
    private String diagnosisNotes;

    @CreationTimestamp
    @Column(name = "diagnosed_at", nullable = false, updatable = false)
    private LocalDateTime diagnosedAt;
}
