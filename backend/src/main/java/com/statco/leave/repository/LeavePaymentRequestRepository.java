package com.statco.leave.repository;

import com.statco.leave.model.LeavePaymentRequest;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface LeavePaymentRequestRepository extends JpaRepository<LeavePaymentRequest, Long> {

    List<LeavePaymentRequest> findByStatusOrderByCreatedAtAsc(LeavePaymentRequest.PaymentStatus status);

    List<LeavePaymentRequest> findByEmployeeOrderByCreatedAtDesc(User employee);

    List<LeavePaymentRequest> findByProcessedByAccountOrderByProcessedAtDesc(User accountUser);

    @Query("SELECT p FROM LeavePaymentRequest p WHERE p.leaveRequest.id = :leaveRequestId")
    Optional<LeavePaymentRequest> findByLeaveRequestId(@Param("leaveRequestId") Long leaveRequestId);
}
