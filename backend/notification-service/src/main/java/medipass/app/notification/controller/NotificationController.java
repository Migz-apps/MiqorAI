package medipass.app.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import medipass.app.notification.dto.ApiResponse;
import medipass.app.notification.entity.Notification;
import medipass.app.notification.repository.NotificationRepository;
import medipass.app.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Notification management (admin)")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "List all notifications")
    public ResponseEntity<ApiResponse<List<Notification>>> listNotifications() {
        return ResponseEntity.ok(ApiResponse.success(
                "Notifications retrieved",
                notificationRepository.findAll()
        ));
    }

    @GetMapping("/{notificationId}")
    @Operation(summary = "Get notification by ID")
    public ResponseEntity<ApiResponse<Notification>> getNotification(@PathVariable UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));
        return ResponseEntity.ok(ApiResponse.success("Notification retrieved", notification));
    }

    @PostMapping("/{notificationId}/retry")
    @Operation(summary = "Retry a failed notification delivery")
    public ResponseEntity<ApiResponse<Void>> retryNotification(@PathVariable UUID notificationId) {
        notificationService.retryNotification(notificationId);
        return ResponseEntity.ok(ApiResponse.success("Notification retry initiated"));
    }
}
