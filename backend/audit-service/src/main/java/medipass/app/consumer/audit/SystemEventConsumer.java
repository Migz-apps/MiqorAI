package medipass.app.consumer.audit;

import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.service.SystemEventService;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Consumes infrastructure and system events from the audit.system.events queue.
 * Routes to SystemEventService.saveSystemEvent().
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SystemEventConsumer {

    private final SystemEventService systemEventService;

    @RabbitListener(queues = "${rabbitmq.queues.system-events:audit.system.events}")
    public void consumeSystemEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        
        String correlationId = event.getCorrelationId() != null ? event.getCorrelationId() : "unknown";
        MDC.put("correlationId", correlationId);
        try {
            log.info("Consuming system event type={} correlationId={}", event.getEventType(), correlationId);
            systemEventService.saveSystemEvent(event);
            channel.basicAck(deliveryTag, false);
        } catch (DuplicateAuditEventException ex) {
            log.debug("Duplicate system event discarded: {}", ex.getMessage());
            channel.basicAck(deliveryTag, false);
        } catch (Exception ex) {
            log.error("Failed to process system event type={}: {}", event.getEventType(), ex.getMessage());
            channel.basicNack(deliveryTag, false, false);
        } finally {
            MDC.remove("correlationId");
        }
    }
}
