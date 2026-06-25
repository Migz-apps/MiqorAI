package medipass.app.patient.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.entity.BackupCode;
import medipass.app.patient.exception.InvalidPatientDataException;
import medipass.app.patient.repository.BackupCodeRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupCodeService {

    private static final int CODE_COUNT = 8;
    private static final int CODE_BYTES = 12;

    private final BackupCodeRepository backupCodeRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a fresh set of backup codes for a patient.
     * Previous codes are deleted before generating new ones.
     *
     * @return list of plain-text codes (shown once, never stored in plain text)
     */
    @Transactional
    public List<String> generateBackupCodes(UUID patientId) {
        // Revoke all existing codes first
        backupCodeRepository.deleteByPatientId(patientId);

        List<String> plainCodes = new ArrayList<>();
        List<BackupCode> entities = new ArrayList<>();

        for (int i = 0; i < CODE_COUNT; i++) {
            byte[] bytes = new byte[CODE_BYTES];
            secureRandom.nextBytes(bytes);
            String plainCode = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            plainCodes.add(plainCode);

            entities.add(BackupCode.builder()
                    .patientId(patientId)
                    .codeHash(passwordEncoder.encode(plainCode))
                    .used(false)
                    .build());
        }

        backupCodeRepository.saveAll(entities);
        log.info("Generated {} backup codes for patientId={}", CODE_COUNT, patientId);
        return plainCodes;
    }

    /**
     * Validates a backup code and marks it as used if valid.
     */
    @Transactional
    public boolean validateAndUseBackupCode(UUID patientId, String plainCode) {
        List<BackupCode> unusedCodes = backupCodeRepository.findByPatientIdAndUsedFalse(patientId);

        for (BackupCode code : unusedCodes) {
            if (passwordEncoder.matches(plainCode, code.getCodeHash())) {
                code.setUsed(true);
                backupCodeRepository.save(code);
                log.info("Backup code used for patientId={}", patientId);
                return true;
            }
        }
        return false;
    }

    public List<BackupCode> getUnusedCodes(UUID patientId) {
        return backupCodeRepository.findByPatientIdAndUsedFalse(patientId);
    }

    @Transactional
    public void revokeAllCodes(UUID patientId) {
        backupCodeRepository.deleteByPatientId(patientId);
        log.info("All backup codes revoked for patientId={}", patientId);
    }
}
