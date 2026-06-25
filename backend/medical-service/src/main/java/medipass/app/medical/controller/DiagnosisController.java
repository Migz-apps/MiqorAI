package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreateDiagnosisRequest;
import medipass.app.medical.dto.DiagnosisResponse;
import medipass.app.medical.service.DiagnosisService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/diagnoses")
@RequiredArgsConstructor
@Tag(name = "Diagnoses", description = "Diagnosis management")
@SecurityRequirement(name = "bearerAuth")
public class DiagnosisController {

    private final DiagnosisService diagnosisService;

    @PostMapping("/create")
    @Operation(summary = "Create a diagnosis record")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<DiagnosisResponse>> createDiagnosis(
            @Valid @RequestBody CreateDiagnosisRequest request) {
        DiagnosisResponse response = diagnosisService.createDiagnosis(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Diagnosis created successfully", response));
    }

    @GetMapping("/visit/{visitId}")
    @Operation(summary = "Get diagnoses for a visit")
    public ResponseEntity<ApiResponse<List<DiagnosisResponse>>> getDiagnosesByVisit(
            @PathVariable UUID visitId) {
        List<DiagnosisResponse> responses = diagnosisService.getDiagnosesByVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success("Diagnoses retrieved", responses));
    }

    @GetMapping("/doctor/{doctorId}")
    @Operation(summary = "Get diagnoses created by a doctor")
    public ResponseEntity<ApiResponse<List<DiagnosisResponse>>> getDiagnosesByDoctor(
            @PathVariable UUID doctorId) {
        List<DiagnosisResponse> responses = diagnosisService.getDiagnosesByDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success("Diagnoses retrieved", responses));
    }
}
