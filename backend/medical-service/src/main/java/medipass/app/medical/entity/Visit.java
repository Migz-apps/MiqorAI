package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "visits", schema = "medical_schema", indexes = {
        @Index(name = "idx_visit_patient_id", columnList = "patient_id"),
        @Index(name = "idx_visit_doctor_id", columnList = "doctor_id"),
        @Index(name = "idx_visit_hospital_id", columnList = "hospital_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "hospital_id", nullable = false)
    private UUID hospitalId;

    @Column(name = "doctor_id", nullable = false)
    private UUID doctorId;

    @Column(name = "visit_reason", nullable = false, columnDefinition = "TEXT")
    private String visitReason;

    @Column(name = "diagnosis", columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private VisitStatus status = VisitStatus.ONGOING;

    @Column(name = "visit_date", nullable = false)
    private LocalDateTime visitDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
