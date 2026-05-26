package com.statco.leave.controller;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.Grade;
import com.statco.leave.model.LeaveBalance;
import com.statco.leave.model.User;
import com.statco.leave.repository.GradeRepository;
import com.statco.leave.repository.LeaveBalanceRepository;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final UserRepository userRepo;
    private final LeaveBalanceRepository balanceRepo;
    private final GradeRepository gradeRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    // ── Admin: create staff ────────────────────────────────────
    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(@Valid @RequestBody Dto.CreateStaffRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body("Email already in use");
        }
        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getTemporaryPassword()));
        user.setDepartment(req.getDepartment());
        user.setPosition(req.getPosition());
        user.setPhone(req.getPhone());
        user.setRole(req.getRole() != null ? req.getRole() : User.Role.EMPLOYEE);
        user.setApprovalLevel(req.getApprovalLevel() != null ? req.getApprovalLevel() : User.ApprovalLevel.NONE);
        if (req.getGradeId() != null) {
            Grade grade = gradeRepo.findById(req.getGradeId())
                    .orElseThrow(() -> new RuntimeException("Grade not found"));
            user.setGrade(grade);
        }
        user.setMustChangePassword(true);
        User saved = userRepo.save(user);

        // Create leave balance
        LeaveBalance balance = new LeaveBalance();
        balance.setEmployee(saved);
        balanceRepo.save(balance);

        return ResponseEntity.ok(saved);
    }

    // ── Admin: list all staff ──────────────────────────────────
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllStaff() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    // ── Admin: assign grade to staff ──────────────────────────
    @PutMapping("/admin/{id}/grade")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignGrade(@PathVariable Long id, @RequestBody java.util.Map<String, Long> body) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long gradeId = body.get("gradeId");
        if (gradeId == null) {
            user.setGrade(null);
        } else {
            Grade grade = gradeRepo.findById(gradeId)
                    .orElseThrow(() -> new RuntimeException("Grade not found"));
            user.setGrade(grade);
        }
        return ResponseEntity.ok(userRepo.save(user));
    }

    // ── Admin: deactivate/activate staff ─────────────────────
    @PutMapping("/admin/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleActive(@PathVariable Long id) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(!user.isActive());
        return ResponseEntity.ok(userRepo.save(user));
    }

    // ── Admin: reset staff password ───────────────────────────
    @PutMapping("/admin/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetPassword(@PathVariable Long id,
                                           @RequestBody Dto.ChangePasswordRequest req) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setMustChangePassword(true);
        userRepo.save(user);
        return ResponseEntity.ok("Password reset. Staff will be prompted to change on next login.");
    }

    // ── Staff: change own password ─────────────────────────────
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody Dto.ChangePasswordRequest req,
                                            Authentication auth) {
        User user = userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify current password if not a forced reset
        if (req.getCurrentPassword() != null && !req.getCurrentPassword().isEmpty()) {
            if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body("Current password is incorrect");
            }
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setMustChangePassword(false);
        userRepo.save(user);

        // Return fresh token
        String token = jwtUtils.generateToken(user.getEmail());
        return ResponseEntity.ok(new Dto.AuthResponse(token, user));
    }

    // ── Staff: update own profile ──────────────────────────────
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Dto.UpdateProfileRequest req,
                                           Authentication auth) {
        User user = userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (req.getFullName() != null && !req.getFullName().isBlank())
            user.setFullName(req.getFullName());
        if (req.getDepartment() != null)
            user.setDepartment(req.getDepartment());
        if (req.getPosition() != null)
            user.setPosition(req.getPosition());
        if (req.getPhone() != null)
            user.setPhone(req.getPhone());

        return ResponseEntity.ok(userRepo.save(user));
    }

    // ── Staff: get own profile ─────────────────────────────────
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication auth) {
        return ResponseEntity.ok(userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found")));
    }
}