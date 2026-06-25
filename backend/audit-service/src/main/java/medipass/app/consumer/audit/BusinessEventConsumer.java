package medipass.app.consumer.audit;

import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.service.AuditLogService;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Consumes business domain events from all non-security, non-system queues:
 * patient, visit, prescription, test, auth, and medical events.
 * Each listener is independent — a failure in one does not affect others.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BusinessEventConsumer {

    private final AuditLogService auditLogService;

    @RabbitListener(queues = "${rabbitmq.queues.patient-events:audit.patient.events}")
    public void consumePatientEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        processEvent(event, channel, deliveryTag, "patient");
    }

    @RabbitListener(queues = "${rabbitmq.queues.visit-events:audit.visit.events}")
    public void consumeVisitEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        processEvent(event, channel, deliveryTag, "visit");
    }

    @RabbitListener(queues = "${rabbitmq.queues.prescription-events:audit.prescription.events}")
    public void consumePrescriptionEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        processEvent(event, channel, deliveryTag, "prescription");
    }

    @RabbitListener(queues = "${rabbitmq.queues.test-events:audit.test.events}")
    public void consumeTestEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        processEvent(event, channel, deliveryTag, "test");
    }

    @RabbitListener(queues = "${rabbitmq.queues.auth-events:audit.auth.events}")
    public void consumeAuthEvent(
            InboundAuditEvent event,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        processEvent(event, channel, deliveryTag, "auth");
    }

    // ── shared processing logic ───────────────────────────────────────────────

    private void processEvent(InboundAuditEvent event, Channel channel,
                               long deliveryTag, String domain) throws IOException {
        String correlationId = event.getCorrelationId() != null ? event.getCorrelationId() : "unknown";
        MDC.put("correlationId", correlationId);
        try {
            log.info("Consuming {} event type={} correlationId={}", domain, event.getEventType(), correlationId);
            auditLogService.saveAuditLog(event);
            channel.basicAck(deliveryTag, false);
        } catch (DuplicateAuditEventException ex) {
            // Duplicate — ack and discard silently
            log.debug("Duplicate {} event discarded: {}", domain, ex.getMessage());
            channel.basicAck(deliveryTag, false);
        } catch (Exception ex) {
            // Nack without requeue — send to dead-letter queue
            log.error("Failed to process {} event type={}: {}", domain, event.getEventType(), ex.getMessage());
            channel.basicNack(deliveryTag, false, false);
        } finally {
            MDC.remove("correlationId");
        }
    }
}
