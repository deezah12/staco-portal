package com.statco.leave.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/** Employee's feedback response to a question after review is CLOSED. Visible to HR only. */
@Data
@NoArgsConstructor
@Entity
@Table(name = "feedback_responses")
public class FeedbackResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private PerformanceReview review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private FeedbackQuestion question;

    private Integer rating;    // 1-5 for RATING and BOTH types
    private String textAnswer; // for TEXT and BOTH types

    @Column(nullable = false)
    private LocalDateTime answeredAt = LocalDateTime.now();
}
