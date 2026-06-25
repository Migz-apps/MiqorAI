package medipass.app.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.notification.entity.NotificationChannel;
import medipass.app.notification.entity.NotificationTemplate;
import medipass.app.notification.exception.TemplateNotFoundException;
import medipass.app.notification.repository.TemplateRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateService {

      private final TemplateRepository templateRepository;

      public String formatMessage(String templateName, NotificationChannel channel, Map<String, Object> placeholders) {
          NotificationTemplate template = templateRepository.findByTemplateNameAndChannelAndIsActiveTrue(templateName, channel)
                  .orElseThrow(() -> new TemplateNotFoundException("Active template not found for name: " + templateName + " and channel: " + channel));

          String body = template.getBody();
          if (body == null) {
              return "";
          }

          if (placeholders != null) {
              for (Map.Entry<String, Object> entry : placeholders.entrySet()) {
                  String key = "{" + entry.getKey() + "}";
                  String value = entry.getValue() != null ? entry.getValue().toString() : "";
                  body = body.replace(key, value);
              }
          }
          return body;
      }

      public String getSubject(String templateName, NotificationChannel channel) {
          return templateRepository.findByTemplateNameAndChannelAndIsActiveTrue(templateName, channel)
                  .map(NotificationTemplate::getSubject)
                  .orElse("");
      }
}
