package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.MedicalHistoryResponse;
import medipass.app.medical.dto.PatientContinuitySummaryResponse;
import medipass.app.medical.service.MedicalHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
@Tag(name = "Medical History", description = "Aggregated patient medical history timeline")
@SecurityRequirement(name = "bearerAuth")
public class MedicalHistoryController {

    private final MedicalHistoryService medicalHistoryService;

    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get full medical history for a patient")
    public ResponseEntity<ApiResponse<MedicalHistoryResponse>> getPatientHistory(
            @PathVariable UUID patientId) {
        MedicalHistoryResponse response = medicalHistoryService.getPatientHistory(patientId);
        return ResponseEntity.ok(ApiResponse.success("Medical history retrieved", response));
    }

    @GetMapping("/patient/{patientId}/continuity")
    @Operation(summary = "Get patient cross-hospital continuity summary")
    public ResponseEntity<ApiResponse<PatientContinuitySummaryResponse>> getPatientContinuitySummary(
            @PathVariable UUID patientId) {
        PatientContinuitySummaryResponse response = medicalHistoryService.getPatientContinuitySummary(patientId);
        return ResponseEntity.ok(ApiResponse.success("Patient continuity summary retrieved", response));
    }
}
