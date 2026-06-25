package medipass.app.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.auth.entity.Session;
import medipass.app.auth.repository.SessionRepository;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private static final String SESSION_BLACKLIST_PREFIX = "session:blacklist:";

    private final SessionRepository sessionRepository;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public Session createSession(UUID userId, String token, LocalDateTime expiresAt) {
        Session session = Session.builder()
                .userId(userId)
                .token(token)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();
        Session saved = sessionRepository.save(session);
        log.info("Session created for userId={}", userId);
        return saved;
    }

    @Transactional
    public void revokeSession(String token) {
        sessionRepository.findByToken(token).ifPresent(session -> {
            session.setRevoked(true);
            sessionRepository.save(session);
            // Also blacklist in Redis for fast lookup
            blacklistToken(token, session.getExpiresAt());
            log.info("Session revoked for userId={}", session.getUserId());
        });
    }

    @Transactional
    public void revokeAllUserSessions(UUID userId) {
        List<Session> sessions = sessionRepository.findByUserId(userId);
        sessions.forEach(session -> {
            session.setRevoked(true);
            blacklistToken(session.getToken(), session.getExpiresAt());
        });
        sessionRepository.saveAll(sessions);
        log.info("All sessions revoked for userId={}", userId);
    }

    public Optional<Session> findSession(String token) {
        return sessionRepository.findByToken(token);
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(SESSION_BLACKLIST_PREFIX + token));
    }

    private void blacklistToken(String token, LocalDateTime expiresAt) {
        long ttlSeconds = java.time.Duration.between(LocalDateTime.now(), expiresAt).getSeconds();
        if (ttlSeconds > 0) {
            redisTemplate.opsForValue().set(
                    SESSION_BLACKLIST_PREFIX + token,
                    "revoked",
                    ttlSeconds,
                    TimeUnit.SECONDS
            );
        }
    }
}
