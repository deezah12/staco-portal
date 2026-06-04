package com.statco.leave.service;

import com.statco.leave.dto.Dto;
import com.statco.leave.model.Announcement;
import com.statco.leave.model.User;
import com.statco.leave.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepo;

    public List<Announcement> getAdminAnnouncements() {
        return announcementRepo.findAllByOrderByPinnedDescCreatedAtDesc();
    }

    public List<Announcement> getVisibleAnnouncements(User user) {
        String department = user.getDepartment() == null ? "" : user.getDepartment();
        return announcementRepo.findVisibleForDepartment(department);
    }

    public Announcement createAnnouncement(Dto.AnnouncementRequest dto, User admin) {
        Announcement announcement = new Announcement();
        applyDto(announcement, dto);
        announcement.setCreatedBy(admin);
        return announcementRepo.save(announcement);
    }

    public Announcement updateAnnouncement(Long id, Dto.AnnouncementRequest dto) {
        Announcement announcement = announcementRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        applyDto(announcement, dto);
        announcement.setUpdatedAt(LocalDateTime.now());
        return announcementRepo.save(announcement);
    }

    public Announcement togglePublished(Long id) {
        Announcement announcement = announcementRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        announcement.setPublished(!announcement.isPublished());
        announcement.setUpdatedAt(LocalDateTime.now());
        return announcementRepo.save(announcement);
    }

    public void deleteAnnouncement(Long id) {
        if (!announcementRepo.existsById(id)) {
            throw new RuntimeException("Announcement not found");
        }
        announcementRepo.deleteById(id);
    }

    private void applyDto(Announcement announcement, Dto.AnnouncementRequest dto) {
        announcement.setTitle(dto.getTitle().trim());
        announcement.setBody(dto.getBody().trim());
        announcement.setDepartment(dto.getDepartment() == null || dto.getDepartment().isBlank()
                ? null
                : dto.getDepartment().trim());
        announcement.setPublished(dto.isPublished());
        announcement.setPinned(dto.isPinned());
    }
}
