package medipass.app.notification.service;

import medipass.app.notification.event.InboundEvent;
import medipass.app.notification.repository.DeliveryLogRepository;
import medipass.app.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private DeliveryLogRepository deliveryLogRepository;
    @Mock
    private TemplateService templateService;
    @Mock
    private EmailService emailService;
    @Mock
    private SmsService smsService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void processEvent_ignoresEmptyPayload() {
        ReflectionTestUtils.setField(notificationService, "maxRetries", 3);

        InboundEvent event = new InboundEvent();
        event.setEventType("visit.created");
        event.setServiceName("medical-service");

        notificationService.processEvent(event);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void processEvent_skipsWhenNoContactDetails() throws Exception {
        ReflectionTestUtils.setField(notificationService, "maxRetries", 3);

        InboundEvent event = new InboundEvent();
        event.setEventType("visit.created");
        event.setServiceName("medical-service");
        event.setPayload(Map.of("visitId", "abc"));

        org.mockito.Mockito.when(templateService.formatMessage(any(), any(), any()))
                .thenThrow(new medipass.app.notification.exception.TemplateNotFoundException("missing"));

        notificationService.processEvent(event);

        verify(notificationRepository, never()).save(any());
    }
}
