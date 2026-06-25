package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreateVisitRequest;
import medipass.app.medical.dto.VisitResponse;
import medipass.app.medical.service.VisitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/visits")
@RequiredArgsConstructor
@Tag(name = "Visits", description = "Patient visit management")
@SecurityRequirement(name = "bearerAuth")
public class VisitController {

    private final VisitService visitService;

    @PostMapping("/create")
    @Operation(summary = "Create a new patient visit")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<VisitResponse>> createVisit(
            @Valid @RequestBody CreateVisitRequest request) {
        VisitResponse response = visitService.createVisit(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Visit created successfully", response));
    }

    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get all visits for a patient")
    public ResponseEntity<ApiResponse<List<VisitResponse>>> getVisitsByPatient(
            @PathVariable UUID patientId) {
        List<VisitResponse> visits = visitService.getVisitsByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Visits retrieved", visits));
    }

    @GetMapping("/hospital/{hospitalId}")
    @Operation(summary = "Get all visits for a hospital")
    public ResponseEntity<ApiResponse<List<VisitResponse>>> getVisitsByHospital(
            @PathVariable UUID hospitalId) {
        List<VisitResponse> visits = visitService.getVisitsByHospital(hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Visits retrieved", visits));
    }

    @GetMapping("/doctor/{doctorId}")
    @Operation(summary = "Get all visits for a doctor")
    public ResponseEntity<ApiResponse<List<VisitResponse>>> getVisitsByDoctor(
            @PathVariable UUID doctorId) {
        List<VisitResponse> visits = visitService.getVisitsByDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success("Visits retrieved", visits));
    }

    @GetMapping("/{visitId}")
    @Operation(summary = "Get a single visit by ID")
    public ResponseEntity<ApiResponse<VisitResponse>> getVisit(
            @PathVariable UUID visitId) {
        VisitResponse response = visitService.getVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success("Visit retrieved", response));
    }
}
