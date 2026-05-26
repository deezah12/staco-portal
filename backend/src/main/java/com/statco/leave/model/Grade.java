package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents an employee grade level.
 * Higher `level` number = higher grade in the hierarchy.
 * Used to validate guarantor eligibility — guarantor.grade.level must be > applicant.grade.level
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "grades")
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // e.g. "Grade 7 - Senior Officer"

    @Column(nullable = false, unique = true)
    private int level; // numeric hierarchy — higher = senior

    @Column(length = 500)
    private String description;
}
