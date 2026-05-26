package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "competency_scores")
public class CompetencyScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "competencyScores"})
    private PerformanceReview review;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Competency competency;

    @Column(nullable = false)
    private int score;

    private String comment;

    public enum Competency {
        COMMUNICATION("Communication"),
        TEAMWORK("Teamwork & Collaboration"),
        PRODUCTIVITY("Productivity & Output"),
        PROBLEM_SOLVING("Problem Solving"),
        LEADERSHIP("Leadership"),
        ATTITUDE("Attitude & Professionalism"),
        INNOVATION("Innovation & Initiative"),
        TIME_MANAGEMENT("Time Management");

        private final String label;
        Competency(String label) { this.label = label; }
        public String getLabel() { return label; }
    }
}