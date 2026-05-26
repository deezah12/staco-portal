package com.statco.leave.repository;

import com.statco.leave.model.PerformanceReview;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PerformanceReviewRepository extends JpaRepository<PerformanceReview, Long> {
    List<PerformanceReview> findByEmployeeOrderByCreatedAtDesc(User employee);
    List<PerformanceReview> findByManagerOrderByCreatedAtDesc(User manager);
    List<PerformanceReview> findAllByOrderByCreatedAtDesc();
    List<PerformanceReview> findByStatusOrderByCreatedAtDesc(PerformanceReview.ReviewStatus status);

    @Query("SELECT r FROM PerformanceReview r WHERE r.manager = :manager AND r.status = :status")
    List<PerformanceReview> findByManagerAndStatus(@Param("manager") User manager,
                                                    @Param("status") PerformanceReview.ReviewStatus status);

    Optional<PerformanceReview> findByEmployeeAndReviewPeriod(User employee, String reviewPeriod);

    @Query("SELECT COUNT(r) FROM PerformanceReview r WHERE r.status = 'ELIGIBLE'")
    long countEligible();

    @Query("SELECT COUNT(r) FROM PerformanceReview r WHERE r.status = 'APPRAISED'")
    long countAwaitingEmployee();

    @Query("SELECT COUNT(r) FROM PerformanceReview r WHERE r.status = 'DISPUTED'")
    long countDisputed();
}
