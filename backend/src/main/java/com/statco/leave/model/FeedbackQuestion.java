package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** HR-configured feedback questions shown to employee after review is CLOSED */
@Data
@NoArgsConstructor
@Entity
@Table(name = "feedback_questions")
public class FeedbackQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type;

    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    public enum QuestionType {
        RATING,  // 1-5 star rating
        TEXT,    // free text answer
        BOTH     // both rating + text
    }
}
