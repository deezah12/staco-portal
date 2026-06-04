package com.statco.leave.controller;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.User;
import com.statco.leave.repository.UserRepository;
import com.statco.leave.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final UserRepository userRepo;

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> visible(Authentication auth) {
        return ResponseEntity.ok(announcementService.getVisibleAnnouncements(getUser(auth)));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<?> adminList() {
        return ResponseEntity.ok(announcementService.getAdminAnnouncements());
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody Dto.AnnouncementRequest dto, Authentication auth) {
        return ResponseEntity.ok(announcementService.createAnnouncement(dto, getUser(auth)));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody Dto.AnnouncementRequest dto) {
        return ResponseEntity.ok(announcementService.updateAnnouncement(id, dto));
    }

    @PostMapping("/admin/{id}/toggle-published")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<?> togglePublished(@PathVariable Long id) {
        return ResponseEntity.ok(announcementService.togglePublished(id));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        announcementService.deleteAnnouncement(id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted"));
    }
}
