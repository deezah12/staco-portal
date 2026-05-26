package com.statco.leave.repository;

import com.statco.leave.model.LeaveRequest;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(User employee);
    List<LeaveRequest> findAllByOrderByCreatedAtDesc();

    // Pending at each approval stage
    List<LeaveRequest> findByStatusOrderByCreatedAtAsc(LeaveRequest.Status status);

    // Pending for a specific department (Unit Head / Div Head views)
    @Query("SELECT l FROM LeaveRequest l WHERE l.status = :status AND l.employee.department = :dept ORDER BY l.createdAt ASC")
    List<LeaveRequest> findByStatusAndDepartment(
            @Param("status") LeaveRequest.Status status,
            @Param("dept") String department);

    // Active leaves that have passed their end date and not yet resumed — overstays
    @Query("SELECT l FROM LeaveRequest l WHERE l.status = 'ACTIVE' AND l.endDate < :today AND (l.resumedConfirmedByHr = false OR l.resumedConfirmedByHod = false)")
    List<LeaveRequest> findOverstayedLeaves(@Param("today") LocalDate today);

    // Leaves ending in exactly N days — for reminder job
    @Query("SELECT l FROM LeaveRequest l WHERE l.status = 'ACTIVE' AND l.endDate = :targetDate AND l.twoDayReminderSent = false")
    List<LeaveRequest> findLeavesEndingOn(@Param("targetDate") LocalDate targetDate);

    // Resumption day — leaves whose end date is today and reminder not yet sent
    @Query("SELECT l FROM LeaveRequest l WHERE l.status = 'ACTIVE' AND l.endDate = :today AND l.resumptionDayReminderSent = false")
    List<LeaveRequest> findResumingToday(@Param("today") LocalDate today);

    // Stats
    @Query("SELECT COUNT(l) FROM LeaveRequest l WHERE l.status IN ('PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_HR')")
    long countPendingRequests();

    @Query("SELECT COUNT(l) FROM LeaveRequest l WHERE l.status = 'ACTIVE'")
    long countActiveLeaves();

    @Query("SELECT COUNT(l) FROM LeaveRequest l WHERE l.status = 'APPROVED'")
    long countApprovedRequests();
}
