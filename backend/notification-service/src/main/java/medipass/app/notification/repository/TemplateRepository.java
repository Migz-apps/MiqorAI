package medipass.app.notification.repository;

import medipass.app.notification.entity.NotificationChannel;
import medipass.app.notification.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TemplateRepository extends JpaRepository<NotificationTemplate, UUID> {
    Optional<NotificationTemplate> findByTemplateNameAndChannelAndIsActiveTrue(String templateName, NotificationChannel channel);
    List<NotificationTemplate> findByTemplateName(String templateName);
    List<NotificationTemplate> findByChannel(NotificationChannel channel);
}
