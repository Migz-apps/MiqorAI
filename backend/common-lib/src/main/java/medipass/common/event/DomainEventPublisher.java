package medipass.common.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnBean(RabbitTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class DomainEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange:medipass.events}")
    private String exchange;

    public void publish(String routingKey, DomainEvent event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
            log.info("Published event type={} service={} entityId={}",
                    event.getEventType(), event.getServiceName(), event.getEntityId());
        } catch (Exception ex) {
            log.error("Failed to publish event type={}: {}", event.getEventType(), ex.getMessage());
        }
    }
}
