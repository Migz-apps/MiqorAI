package medipass.app.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.auth.dto.*;
import medipass.app.auth.entity.User;
import medipass.app.auth.exception.InvalidTokenException;
import medipass.app.auth.exception.UnauthorizedException;
import medipass.app.auth.mapper.UserMapper;
import medipass.app.auth.service.AuthenticationService;
import medipass.app.auth.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Auth endpoints for registration, login, and token management")
public class AuthController {

    private final AuthenticationService authenticationService;
    private final UserService userService;
    private final UserMapper userMapper;

    @PostMapping("/register")
    @Operation(summary = "Register a new account")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authenticationService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created successfully"));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and generate JWT tokens")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authenticationService.login(request.getPhoneNumber(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Generate new access token using refresh token")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        LoginResponse response = authenticationService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate active session", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new InvalidTokenException("No valid token provided");
        }
        String token = authHeader.substring(7);
        authenticationService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    @PostMapping("/validate-token")
    @Operation(summary = "Verify JWT token validity")
    public ResponseEntity<ApiResponse<TokenValidationResponse>> validateToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.ok(ApiResponse.success("Token validation result",
                    TokenValidationResponse.builder().valid(false).build()));
        }
        String token = authHeader.substring(7);
        TokenValidationResponse result = authenticationService.validateToken(token);
        return ResponseEntity.ok(ApiResponse.success("Token validation result", result));
    }

    @GetMapping("/me")
    @Operation(summary = "Get authenticated user details", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return ResponseEntity.ok(ApiResponse.success("User details retrieved", userMapper.toUserResponse(user)));
    }
}
