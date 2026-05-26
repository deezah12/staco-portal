package com.statco.leave.repository;
import com.statco.leave.model.DisciplinaryAction;
import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface DisciplinaryActionRepository extends JpaRepository<DisciplinaryAction, Long> {
    List<DisciplinaryAction> findByEmployeeOrderByLoggedAtDesc(User employee);

    // Sum of deductions for an employee in a specific review period
    @Query("SELECT COALESCE(SUM(d.offenceCategory.deductionMark), 0) FROM DisciplinaryAction d WHERE d.employee = :employee AND d.reviewPeriod = :period")
    double sumDeductionsForPeriod(@Param("employee") User employee, @Param("period") String period);

    List<DisciplinaryAction> findByEmployeeAndReviewPeriodOrderByLoggedAtDesc(User employee, String reviewPeriod);
}
