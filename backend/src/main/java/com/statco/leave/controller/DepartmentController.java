package com.statco.leave.controller;

import com.statco.leave.model.Department;
import com.statco.leave.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository deptRepo;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(deptRepo.findByActiveTrueOrderByNameAsc());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
        if (deptRepo.existsByNameIgnoreCase(name)) return ResponseEntity.badRequest().body(Map.of("error", "Department already exists"));
        Department dept = new Department();
        dept.setName(name.trim());
        dept.setDescription(body.get("description"));
        return ResponseEntity.ok(deptRepo.save(dept));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Department dept = deptRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found"));
        if (body.containsKey("name") && !body.get("name").isBlank()) dept.setName(body.get("name").trim());
        if (body.containsKey("description")) dept.setDescription(body.get("description"));
        return ResponseEntity.ok(deptRepo.save(dept));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivate(@PathVariable Long id) {
        Department dept = deptRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found"));
        dept.setActive(false);
        deptRepo.save(dept);
        return ResponseEntity.ok(Map.of("message", "Department deactivated"));
    }
}