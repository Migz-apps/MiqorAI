package medipass.app.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hospitals", schema = "medical_schema", indexes = {
        @Index(name = "idx_hospital_code", columnList = "hospital_code"),
        @Index(name = "idx_hospital_email", columnList = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "hospital_code", nullable = false, unique = true, length = 100)
    private String hospitalCode;

    @Column(name = "hospital_name", nullable = false, length = 200)
    private String hospitalName;

    @Column(name = "email", nullable = false, unique = true, length = 200)
    private String email;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "sector", length = 100)
    private String sector;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
