package medipass.app.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import medipass.app.audit.entity.AuditLog;
import medipass.app.audit.event.InboundAuditEvent;
import medipass.app.audit.exception.AuditEventValidationException;
import medipass.app.audit.exception.DuplicateAuditEventException;
import medipass.app.audit.mapper.AuditMapper;
import medipass.app.audit.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private AuditMapper auditMapper;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    void saveAuditLog_persistsValidEvent() {
        InboundAuditEvent event = new InboundAuditEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setEventType("visit.created");
        event.setServiceName("medical-service");
        event.setCorrelationId("corr-1");
        event.setEntityId(UUID.randomUUID());
        event.setData(Map.of("visitId", "test"));

        when(auditLogRepository.existsByEventId(event.getEventId())).thenReturn(false);

        auditLogService.saveAuditLog(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("visit.created");
        assertThat(captor.getValue().getServiceName()).isEqualTo("medical-service");
    }

    @Test
    void saveAuditLog_throwsWhenDuplicate() {
        InboundAuditEvent event = new InboundAuditEvent();
        event.setEventId("evt-1");
        event.setEventType("visit.created");
        event.setServiceName("medical-service");
        event.setCorrelationId("corr-1");

        when(auditLogRepository.existsByEventId("evt-1")).thenReturn(true);

        assertThatThrownBy(() -> auditLogService.saveAuditLog(event))
                .isInstanceOf(DuplicateAuditEventException.class);
    }

    @Test
    void saveAuditLog_throwsWhenMissingEventType() {
        InboundAuditEvent event = new InboundAuditEvent();
        event.setServiceName("medical-service");
        event.setCorrelationId("corr-1");

        assertThatThrownBy(() -> auditLogService.saveAuditLog(event))
                .isInstanceOf(AuditEventValidationException.class);
    }
}
