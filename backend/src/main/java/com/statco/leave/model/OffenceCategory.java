package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HR-configured offence categories with deduction marks.
 * e.g. Query = -5, Warning = -2, Suspension = -4
 * Marks can be negative (deduction) — HR sets them.
 * Score can go below zero.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "offence_categories")
public class OffenceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // e.g. "Query", "Warning", "Suspension"

    @Column(nullable = false)
    private double deductionMark; // e.g. -5.0, -2.0, -4.0

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active = true;
}
