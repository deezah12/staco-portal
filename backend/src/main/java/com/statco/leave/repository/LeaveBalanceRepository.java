package com.statco.leave.repository;

import com.statco.leave.model.LeaveBalance;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {
    Optional<LeaveBalance> findByEmployee(User employee);
}
