package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "leave_balances")
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    private User employee;

    // Annual Leave
    private int annualTotal = 21;
    private int annualUsed = 0;

    // Sick Leave — total is set by HR on employee bio (synced from User.sickLeaveTotal)
    private int sickTotal = 10;
    private int sickUsed = 0;

    // Casual Leave
    private int casualTotal = 7;
    private int casualUsed = 0;

    // Exam Leave
    private int examTotal = 5;
    private int examUsed = 0;

    // Maternity Leave
    private int maternityTotal = 90;
    private int maternityUsed = 0;

    // Paternity Leave (shown under "Others" in UI)
    private int paternityTotal = 14;
    private int paternityUsed = 0;

    // Unpaid — no total cap, just track usage
    private int unpaidUsed = 0;

    // Computed remaining
    public int getAnnualRemaining()    { return annualTotal - annualUsed; }
    public int getSickRemaining()      { return sickTotal - sickUsed; }
    public int getCasualRemaining()    { return casualTotal - casualUsed; }
    public int getExamRemaining()      { return examTotal - examUsed; }
    public int getMaternityRemaining() { return maternityTotal - maternityUsed; }
    public int getPaternityRemaining() { return paternityTotal - paternityUsed; }
}
