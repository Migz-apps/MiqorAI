package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreateHospitalRequest;
import medipass.app.medical.dto.HospitalResponse;
import medipass.app.medical.dto.UpdateHospitalRequest;
import medipass.app.medical.service.HospitalService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hospitals")
@RequiredArgsConstructor
@Tag(name = "Hospitals", description = "Hospital management")
@SecurityRequirement(name = "bearerAuth")
public class HospitalController {

    private final HospitalService hospitalService;

    @PostMapping("/create")
    @Operation(summary = "Create a new hospital")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<HospitalResponse>> createHospital(
            @Valid @RequestBody CreateHospitalRequest request) {
        HospitalResponse response = hospitalService.createHospital(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Hospital created successfully", response));
    }

    @GetMapping("/all")
    @Operation(summary = "Get all active hospitals")
    public ResponseEntity<ApiResponse<List<HospitalResponse>>> getAllHospitals() {
        List<HospitalResponse> hospitals = hospitalService.getAllHospitals();
        return ResponseEntity.ok(ApiResponse.success("Hospitals retrieved", hospitals));
    }

    @GetMapping("/{hospitalId}")
    @Operation(summary = "Get hospital details by ID")
    public ResponseEntity<ApiResponse<HospitalResponse>> getHospital(
            @PathVariable UUID hospitalId) {
        HospitalResponse response = hospitalService.getHospitalById(hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Hospital retrieved", response));
    }

    @PutMapping("/{hospitalId}")
    @Operation(summary = "Update hospital details")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<HospitalResponse>> updateHospital(
            @PathVariable UUID hospitalId,
            @Valid @RequestBody UpdateHospitalRequest request) {
        HospitalResponse response = hospitalService.updateHospital(hospitalId, request);
        return ResponseEntity.ok(ApiResponse.success("Hospital updated successfully", response));
    }

    @DeleteMapping("/{hospitalId}")
    @Operation(summary = "Soft delete a hospital")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteHospital(@PathVariable UUID hospitalId) {
        hospitalService.softDeleteHospital(hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Hospital deleted successfully"));
    }
}
