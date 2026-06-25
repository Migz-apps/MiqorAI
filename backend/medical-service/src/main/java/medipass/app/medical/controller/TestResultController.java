package medipass.app.medical.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import medipass.app.medical.dto.ApiResponse;
import medipass.app.medical.dto.CreateTestResultRequest;
import medipass.app.medical.dto.TestResultResponse;
import medipass.app.medical.service.TestResultService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tests")
@RequiredArgsConstructor
@Tag(name = "Test Results", description = "Laboratory test result management")
@SecurityRequirement(name = "bearerAuth")
public class TestResultController {

    private final TestResultService testResultService;

    @PostMapping("/create")
    @Operation(summary = "Store a laboratory test result")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<TestResultResponse>> createTestResult(
            @Valid @RequestBody CreateTestResultRequest request) {
        TestResultResponse response = testResultService.createTestResult(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Test result stored successfully", response));
    }

    @GetMapping("/visit/{visitId}")
    @Operation(summary = "Get all test results for a visit")
    public ResponseEntity<ApiResponse<List<TestResultResponse>>> getTestResultsByVisit(
            @PathVariable UUID visitId) {
        List<TestResultResponse> results = testResultService.getTestResultsByVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success("Test results retrieved", results));
    }
}
