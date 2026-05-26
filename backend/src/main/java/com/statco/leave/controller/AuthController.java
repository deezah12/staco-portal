package com.statco.leave.controller;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.LeaveBalance;
import com.statco.leave.model.User;
import com.statco.leave.repository.LeaveBalanceRepository;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.security.JwtUtils;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserRepository userRepo;
    private final LeaveBalanceRepository balanceRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody Dto.LoginRequest request) {
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        User user = userRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = jwtUtils.generateToken(user.getEmail());
        return ResponseEntity.ok(new Dto.AuthResponse(token, user));
    }

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody Dto.RegisterRequest request) {
        if (userRepo.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already in use");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDepartment(request.getDepartment());
        user.setPosition(request.getPosition());
        user.setRole(request.getRole() != null ? request.getRole() : User.Role.EMPLOYEE);
        User saved = userRepo.save(user);

        // Create leave balance
        LeaveBalance balance = new LeaveBalance();
        balance.setEmployee(saved);
        balanceRepo.save(balance);

        String token = jwtUtils.generateToken(saved.getEmail());
        return ResponseEntity.ok(new Dto.AuthResponse(token, saved));
    }
}
