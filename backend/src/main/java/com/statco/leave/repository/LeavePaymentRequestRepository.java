package com.statco.leave.repository;

import com.statco.leave.model.LeavePaymentRequest;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LeavePaymentRequestRepository extends JpaRepository<LeavePaymentRequest, Long> {

    List<LeavePaymentRequest> findByStatusOrderByCreatedAtAsc(LeavePaymentRequest.PaymentStatus status);

    List<LeavePaymentRequest> findByEmployeeOrderByCreatedAtDesc(User employee);

    Optional<LeavePaymentRequest> findByLeaveRequestId(Long leaveRequestId);
}
