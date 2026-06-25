package medipass.app.patient.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.QRCodeResponse;
import medipass.app.patient.entity.Patient;
import medipass.app.patient.exception.PatientNotFoundException;
import medipass.app.patient.qr.QRCodeGenerator;
import medipass.app.patient.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QRCodeService {

    private final PatientRepository patientRepository;
    private final QRCodeGenerator qrCodeGenerator;

    @Value("${qr.secret:medipass-qr-secret-key-2026}")
    private String qrSecret;

    /**
     * Generates a QR code for a patient. The QR content contains the patient UUID
     * and a tamper-resistant HMAC-style hash — no raw PII is embedded.
     */
    public QRCodeResponse generateQRCode(UUID patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found: " + patientId));

        String qrContent = buildQRContent(patient.getId(), patient.getQrCodeHash());
        String base64Image = qrCodeGenerator.generateQRCodeBase64(qrContent);

        log.info("QR code generated for patientId={}", patientId);

        return QRCodeResponse.builder()
                .qrCode(base64Image)
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
    }

    /**
     * Regenerates the QR code — creates a new hash, invalidating the previous one.
     */
    @Transactional
    public QRCodeResponse regenerateQRCode(UUID patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found: " + patientId));

        String newHash = generateQRHash(patient.getId());
        patient.setQrCodeHash(newHash);
        patientRepository.save(patient);

        String qrContent = buildQRContent(patient.getId(), newHash);
        String base64Image = qrCodeGenerator.generateQRCodeBase64(qrContent);

        log.info("QR code regenerated for patientId={}", patientId);

        return QRCodeResponse.builder()
                .qrCode(base64Image)
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
    }

    /**
     * Validates that a QR hash matches the stored hash for a patient.
     */
    public boolean validateQRCode(UUID patientId, String providedHash) {
        return patientRepository.findById(patientId)
                .map(p -> p.getQrCodeHash() != null && p.getQrCodeHash().equals(providedHash))
                .orElse(false);
    }

    /**
     * Generates a SHA-256 hash of patientId + secret + timestamp seed.
     * Non-guessable and tamper-resistant.
     */
    public String generateQRHash(UUID patientId) {
        try {
            String raw = patientId.toString() + qrSecret + System.nanoTime();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    /**
     * Builds the QR code content string — contains only UUID and verification hash.
     */
    private String buildQRContent(UUID patientId, String hash) {
        return String.format("medipass://patient/%s?v=%s", patientId, hash != null ? hash : "");
    }
}
