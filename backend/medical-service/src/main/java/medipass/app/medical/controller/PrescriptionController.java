package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreatePrescriptionRequest;
import medipass.app.medical.dto.PrescriptionResponse;
import medipass.app.medical.service.PrescriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prescriptions")
@RequiredArgsConstructor
@Tag(name = "Prescriptions", description = "Medication prescription management")
@SecurityRequirement(name = "bearerAuth")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping("/create")
    @Operation(summary = "Create a prescription for a visit")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @Valid @RequestBody CreatePrescriptionRequest request) {
        PrescriptionResponse response = prescriptionService.createPrescription(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Prescription created successfully", response));
    }

    @GetMapping("/visit/{visitId}")
    @Operation(summary = "Get all prescriptions for a visit")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPrescriptionsByVisit(
            @PathVariable UUID visitId) {
        List<PrescriptionResponse> prescriptions = prescriptionService.getPrescriptionsByVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved", prescriptions));
    }
}
