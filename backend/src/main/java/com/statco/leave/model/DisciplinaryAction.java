package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Disciplinary actions logged by HR against a staff member.
 * Each action has a score deduction configured by HR via OffenceCategory.
 * Final appraisal score = manager avg - sum of deductions in that review period.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "disciplinary_actions")
public class DisciplinaryAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offence_category_id", nullable = false)
    private OffenceCategory offenceCategory;

    @Column(nullable = false)
    private String reviewPeriod; // e.g. "H1 2025" — links to appraisal period

    @Column(length = 1000)
    private String description; // details of the incident

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logged_by_id", nullable = false)
    private User loggedBy; // HR user who logged this

    @Column(nullable = false)
    private LocalDateTime loggedAt = LocalDateTime.now();
}
