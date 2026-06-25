package medipass.app.consumer.audit;

import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.service.SecurityAuditService;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Consumes security events from the audit.security.events queue.
 * Routes to SecurityAuditService.saveSecurityLog().
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityEventConsumer {

    private final SecurityAuditService securityAuditService;

    @RabbitListener(queues = "${rabbitmq.queues.security-events:audit.security.events}")
    public void consumeSecurityEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        
        String correlationId = event.getCorrelationId() != null ? event.getCorrelationId() : "unknown";
        MDC.put("correlationId", correlationId);
        try {
            log.info("Consuming security event type={} correlationId={}", event.getEventType(), correlationId);
            securityAuditService.saveSecurityLog(event);
            channel.basicAck(deliveryTag, false);
        } catch (DuplicateAuditEventException ex) {
            log.debug("Duplicate security event discarded: {}", ex.getMessage());
            channel.basicAck(deliveryTag, false);
        } catch (Exception ex) {
            log.error("Failed to process security event type={}: {}", event.getEventType(), ex.getMessage());
            channel.basicNack(deliveryTag, false, false);
        } finally {
            MDC.remove("correlationId");
        }
    }
}
