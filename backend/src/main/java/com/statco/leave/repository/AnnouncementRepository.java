package com.statco.leave.repository;

import com.statco.leave.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    List<Announcement> findAllByOrderByPinnedDescCreatedAtDesc();

    @Query("""
            SELECT a FROM Announcement a
            WHERE a.published = true
              AND (a.department IS NULL OR a.department = '' OR LOWER(a.department) = LOWER(:dept))
            ORDER BY a.pinned DESC, a.createdAt DESC
            """)
    List<Announcement> findVisibleForDepartment(@Param("dept") String department);
}
