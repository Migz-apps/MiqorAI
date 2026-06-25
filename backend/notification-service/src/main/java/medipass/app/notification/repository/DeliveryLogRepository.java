package medipass.app.notification.repository;

import medipass.app.notification.entity.NotificationDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, UUID> {
    List<NotificationDeliveryLog> findByNotificationIdOrderByCreatedAtDesc(UUID notificationId);
    List<NotificationDeliveryLog> findByStatus(String status);
}
