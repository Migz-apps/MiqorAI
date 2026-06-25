package medipass.app.patient.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.ApiResponse;
import medipass.app.patient.dto.QRCodeResponse;
import medipass.app.patient.service.QRCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "QR Code", description = "Patient QR code generation and management")
@SecurityRequirement(name = "bearerAuth")
public class QRCodeController {

    private final QRCodeService qrCodeService;

    @GetMapping("/qr-code/{patientId}")
    @Operation(summary = "Retrieve patient QR code")
    public ResponseEntity<ApiResponse<QRCodeResponse>> getQRCode(
            @PathVariable UUID patientId) {
        QRCodeResponse response = qrCodeService.generateQRCode(patientId);
        return ResponseEntity.ok(ApiResponse.success("QR code retrieved", response));
    }

    @PostMapping("/qr-code/regenerate/{patientId}")
    @Operation(summary = "Regenerate patient QR code — invalidates previous code")
    public ResponseEntity<ApiResponse<QRCodeResponse>> regenerateQRCode(
            @PathVariable UUID patientId) {
        QRCodeResponse response = qrCodeService.regenerateQRCode(patientId);
        return ResponseEntity.ok(ApiResponse.success("QR code regenerated successfully", response));
    }
}
