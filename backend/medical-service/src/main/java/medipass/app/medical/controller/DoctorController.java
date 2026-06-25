package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreateDoctorRequest;
import medipass.app.medical.dto.DoctorResponse;
import medipass.app.medical.dto.UpdateDoctorRequest;
import medipass.app.medical.service.DoctorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
@Tag(name = "Doctors", description = "Doctor management")
@SecurityRequirement(name = "bearerAuth")
public class DoctorController {

    private final DoctorService doctorService;

    @PostMapping("/create")
    @Operation(summary = "Create a new doctor")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<DoctorResponse>> createDoctor(
            @Valid @RequestBody CreateDoctorRequest request) {
        DoctorResponse response = doctorService.createDoctor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Doctor created successfully", response));
    }

    @GetMapping("/hospital/{hospitalId}")
    @Operation(summary = "Get all doctors for a hospital")
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getDoctorsByHospital(
            @PathVariable UUID hospitalId) {
        List<DoctorResponse> doctors = doctorService.getDoctorsByHospital(hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved", doctors));
    }

    @GetMapping("/{doctorId}")
    @Operation(summary = "Get doctor profile by ID")
    public ResponseEntity<ApiResponse<DoctorResponse>> getDoctor(
            @PathVariable UUID doctorId) {
        DoctorResponse response = doctorService.getDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success("Doctor retrieved", response));
    }

    @PutMapping("/{doctorId}")
    @Operation(summary = "Update doctor details")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateDoctor(
            @PathVariable UUID doctorId,
            @Valid @RequestBody UpdateDoctorRequest request) {
        DoctorResponse response = doctorService.updateDoctor(doctorId, request);
        return ResponseEntity.ok(ApiResponse.success("Doctor updated successfully", response));
    }

    @DeleteMapping("/{doctorId}")
    @Operation(summary = "Soft delete a doctor")
    @PreAuthorize("hasAnyRole('HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDoctor(@PathVariable UUID doctorId) {
        doctorService.softDeleteDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success("Doctor deleted successfully"));
    }
}
