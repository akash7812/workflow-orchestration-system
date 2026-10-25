package com.example.myproject.Controller;

import com.example.myproject.Model.User;
import com.example.myproject.Repostiory.UserRepository;
import com.example.myproject.dto.*;
import com.example.myproject.Security.JwtUtil;

import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.example.myproject.Service.PasswordResetService;
import com.example.myproject.dto.ResetPasswordRequestDTO;
import java.util.Map;
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final PasswordResetService passwordResetService;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserRepository userRepo,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            UserDetailsService userDetailsService,
            PasswordResetService passwordResetService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.passwordResetService = passwordResetService;
    }

    // Register User

    @PostMapping("/register")
    public String register(@RequestBody RegisterRequestDTO request) {

        if (request.getUsername() == null ||
                request.getUsername().isBlank() ||
                request.getPassword() == null ||
                request.getPassword().isBlank() ||
                request.getEmail() == null ||
                !request.getEmail().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") ||
                request.getRole() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Valid username, email, password, and role are required"
            );
        }

        if (userRepo.existsByUsername(request.getUsername().trim())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Username already exists"
            );
        }

        if (userRepo.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        userRepo.save(user);

        return "User registered successfully";
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");

        if (email == null || email.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Email is required"
            );
        }

        passwordResetService.requestPasswordReset(email);

        return Map.of(
                "message",
                "If an account exists for that email, a reset link will be sent."
        );
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(
            @RequestBody ResetPasswordRequestDTO request) {

        passwordResetService.resetPassword(
                request.getToken(),
                request.getNewPassword()
        );

        return Map.of("message", "Password reset successful");
    }

    // Login
    @PostMapping("/login")
    public AuthResponseDTO login(@RequestBody AuthRequestDTO request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        UserDetails userDetails =
                userDetailsService.loadUserByUsername(request.getUsername());

        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponseDTO(token);
    }
}