package medipass.app.auth.repository;

import medipass.app.auth.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    Optional<Session> findByToken(String token);

    List<Session> findByUserId(UUID userId);
}
