package com.statco.leave.repository;

import com.statco.leave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(User.Role role);
    List<User> findByDepartment(String department);
    List<User> findByActiveTrue();
    List<User> findByApprovalLevel(User.ApprovalLevel approvalLevel);

    @Query("SELECT u FROM User u WHERE u.department = :dept AND u.approvalLevel = 'UNIT_HEAD' AND u.active = true")
    Optional<User> findUnitHeadByDepartment(@Param("dept") String department);

    @Query("SELECT u FROM User u WHERE u.department = :dept AND u.approvalLevel = 'DIV_HEAD' AND u.active = true")
    Optional<User> findDivHeadByDepartment(@Param("dept") String department);

    /** Returns all active users with a higher grade level than the applicant — for guarantor selection */
    @Query("SELECT u FROM User u WHERE u.active = true AND u.grade IS NOT NULL AND u.grade.level > :gradeLevel AND u.id <> :excludeId ORDER BY u.grade.level ASC, u.fullName ASC")
    List<User> findActiveUsersWithHigherGrade(@Param("gradeLevel") int gradeLevel, @Param("excludeId") Long excludeId);

    List<User> findByActiveTrueAndIdNot(Long excludeId);
}
