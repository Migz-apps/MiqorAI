package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.AddAllergyRequest;
import medipass.app.medical.dto.AllergyResponse;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.service.AllergyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/allergies")
@RequiredArgsConstructor
@Tag(name = "Allergies", description = "Patient allergy management")
@SecurityRequirement(name = "bearerAuth")
public class AllergyController {

    private final AllergyService allergyService;

    @PostMapping("/add")
    @Operation(summary = "Record a patient allergy")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<AllergyResponse>> addAllergy(
            @Valid @RequestBody AddAllergyRequest request) {
        AllergyResponse response = allergyService.addAllergy(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Allergy recorded successfully", response));
    }

    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get all allergies for a patient")
    public ResponseEntity<ApiResponse<List<AllergyResponse>>> getAllergiesByPatient(
            @PathVariable UUID patientId) {
        List<AllergyResponse> allergies = allergyService.getAllergiesByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Allergies retrieved", allergies));
    }
}
