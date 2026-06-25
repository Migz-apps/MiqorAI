package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prescriptions", schema = "medical_schema", indexes = {
        @Index(name = "idx_prescription_visit_id", columnList = "visit_id"),
        @Index(name = "idx_prescription_hospital_id", columnList = "hospital_id"),
        @Index(name = "idx_prescription_doctor_id", columnList = "doctor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

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

    @Column(name = "medication_name", nullable = false, length = 200)
    private String medicationName;

    @Column(name = "dosage", nullable = false, length = 100)
    private String dosage;

    @Column(name = "frequency", nullable = false, length = 100)
    private String frequency;

    @Column(name = "duration", nullable = false, length = 100)
    private String duration;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
