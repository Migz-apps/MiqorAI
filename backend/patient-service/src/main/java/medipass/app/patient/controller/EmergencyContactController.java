package medipass.app.patient.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.patient.dto.ApiResponse;
import medipass.app.patient.dto.EmergencyContactRequest;
import medipass.app.patient.dto.EmergencyContactResponse;
import medipass.app.patient.service.EmergencyContactService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Emergency Contacts", description = "Patient emergency contact management")
@SecurityRequirement(name = "bearerAuth")
public class EmergencyContactController {

    private final EmergencyContactService emergencyContactService;

    @PostMapping("/{patientId}/emergency-contact")
    @Operation(summary = "Add an emergency contact for a patient")
    public ResponseEntity<ApiResponse<EmergencyContactResponse>> addEmergencyContact(
            @PathVariable UUID patientId,
            @Valid @RequestBody EmergencyContactRequest request) {
        EmergencyContactResponse response = emergencyContactService.addEmergencyContact(patientId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Emergency contact added successfully", response));
    }

    @GetMapping("/{patientId}/emergency-contact")
    @Operation(summary = "Retrieve all emergency contacts for a patient")
    public ResponseEntity<ApiResponse<List<EmergencyContactResponse>>> getEmergencyContacts(
            @PathVariable UUID patientId) {
        List<EmergencyContactResponse> contacts = emergencyContactService.getEmergencyContacts(patientId);
        return ResponseEntity.ok(ApiResponse.success("Emergency contacts retrieved", contacts));
    }
}
