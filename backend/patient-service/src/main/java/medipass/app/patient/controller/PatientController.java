package medipass.app.patient.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.ApiResponse;
import medipass.app.patient.dto.PatientResponse;
import medipass.app.patient.dto.RegisterPatientRequest;
import medipass.app.patient.dto.UpdatePatientRequest;
import medipass.app.patient.service.PatientService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Patients", description = "Patient registration and profile management")
@SecurityRequirement(name = "bearerAuth")
public class PatientController {

    private final PatientService patientService;

    @PostMapping("/register")
    @Operation(summary = "Register a new patient")
    public ResponseEntity<ApiResponse<PatientResponse>> register(
            @Valid @RequestBody RegisterPatientRequest request) {
        PatientResponse response = patientService.registerPatient(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient registered successfully", response));
    }

    @GetMapping("/{patientId}")
    @Operation(summary = "Retrieve patient profile by ID")
    public ResponseEntity<ApiResponse<PatientResponse>> getPatient(
            @PathVariable UUID patientId) {
        PatientResponse response = patientService.getPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved successfully", response));
    }

    @PutMapping("/{patientId}")
    @Operation(summary = "Update patient profile")
    public ResponseEntity<ApiResponse<PatientResponse>> updatePatient(
            @PathVariable UUID patientId,
            @Valid @RequestBody UpdatePatientRequest request) {
        PatientResponse response = patientService.updatePatient(patientId, request);
        return ResponseEntity.ok(ApiResponse.success("Patient updated successfully", response));
    }

    @DeleteMapping("/{patientId}")
    @Operation(summary = "Soft delete a patient")
    public ResponseEntity<ApiResponse<Void>> deletePatient(
            @PathVariable UUID patientId) {
        patientService.deletePatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Patient deactivated successfully"));
    }

    @GetMapping("/search")
    @Operation(summary = "Search patients by name, phone number, or national ID")
    public ResponseEntity<ApiResponse<List<PatientResponse>>> searchPatients(
            @RequestParam String query) {
        List<PatientResponse> results = patientService.searchPatients(query);
        return ResponseEntity.ok(ApiResponse.success("Search completed", results));
    }
}
