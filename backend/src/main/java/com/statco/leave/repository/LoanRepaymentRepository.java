package com.statco.leave.repository;

import com.statco.leave.model.LoanRepayment;
import com.statco.leave.model.LoanRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, Long> {
    List<LoanRepayment> findByLoanRequestOrderByInstallmentNumber(LoanRequest loanRequest);

    // Installments that are past due and still PENDING — for daily overdue job
    @Query("SELECT r FROM LoanRepayment r WHERE r.status = 'PENDING' AND r.dueDate < :today")
    List<LoanRepayment> findNewlyOverdue(java.util.Date today);

    @Query("SELECT r FROM LoanRepayment r WHERE r.status = 'PENDING' AND r.dueDate < :today")
    List<LoanRepayment> findOverdueInstallments(LocalDate today);
}
