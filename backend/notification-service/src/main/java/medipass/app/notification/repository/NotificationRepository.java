package medipass.app.notification.repository;

import medipass.app.notification.entity.Notification;
import medipass.app.notification.entity.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientId(UUID recipientId);
    List<Notification> findByStatus(NotificationStatus status);
    List<Notification> findByCorrelationId(String correlationId);
}
