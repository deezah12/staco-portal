package com.statco.leave.repository;

import com.statco.leave.model.LoanGuarantor;
import com.statco.leave.model.LoanRequest;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LoanGuarantorRepository extends JpaRepository<LoanGuarantor, Long> {
    List<LoanGuarantor> findByLoanRequest(LoanRequest loanRequest);
    List<LoanGuarantor> findByGuarantorAndStatusOrderByInvitedAtDesc(User guarantor, LoanGuarantor.GuarantorStatus status);
    List<LoanGuarantor> findByGuarantorOrderByInvitedAtDesc(User guarantor);
    Optional<LoanGuarantor> findByLoanRequestAndGuarantor(LoanRequest loanRequest, User guarantor);
    boolean existsByLoanRequestAndGuarantor(LoanRequest loanRequest, User guarantor);
}
