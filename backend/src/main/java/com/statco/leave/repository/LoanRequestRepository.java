package com.statco.leave.repository;

import com.statco.leave.model.LoanRequest;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface LoanRequestRepository extends JpaRepository<LoanRequest, Long> {

    List<LoanRequest> findByEmployeeOrderByCreatedAtDesc(User employee);
    List<LoanRequest> findByStatusOrderByCreatedAtDesc(LoanRequest.LoanStatus status);
    List<LoanRequest> findAllByOrderByCreatedAtDesc();

    // Check if employee has any blocking active loan
    @Query("SELECT l FROM LoanRequest l WHERE l.employee = :employee " +
           "AND l.status NOT IN ('FULLY_REPAID','REJECTED','CANCELLED')")
    List<LoanRequest> findActiveLoansByEmployee(@Param("employee") User employee);

    // Pending per dept for Unit Head / Div Head
    @Query("SELECT l FROM LoanRequest l WHERE l.status = :status AND l.employee.department = :dept ORDER BY l.createdAt ASC")
    List<LoanRequest> findByStatusAndDepartment(
            @Param("status") LoanRequest.LoanStatus status,
            @Param("dept") String department);

    // Pending for MD (company-wide)
    List<LoanRequest> findByStatusOrderByCreatedAtAsc(LoanRequest.LoanStatus status);

    // Disbursed loans with overdue installments — for daily job
    @Query("SELECT DISTINCT l FROM LoanRequest l JOIN l.repayments r " +
           "WHERE l.status IN ('DISBURSED','OVERDUE') " +
           "AND r.status = 'OVERDUE'")
    List<LoanRequest> findLoansWithOverdueInstallments();

    // Stats
    @Query("SELECT COUNT(l) FROM LoanRequest l WHERE l.status = 'PENDING_MD'")
    long countPendingMd();

    @Query("SELECT COUNT(l) FROM LoanRequest l WHERE l.status IN ('DISBURSED','OVERDUE') AND l.fullyRepaid = false")
    long countActiveLoans();
}
