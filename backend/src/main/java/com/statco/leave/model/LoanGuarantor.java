package com.statco.leave.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "loan_guarantors")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LoanGuarantor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_request_id", nullable = false)
    private LoanRequest loanRequest;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "guarantor_user_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "leaveRequests", "leaveBalance", "password" })
    private User guarantor;

    private int slotNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GuarantorStatus status = GuarantorStatus.PENDING;

    private String comment;
    private LocalDateTime respondedAt;

    @Column(nullable = false)
    private LocalDateTime invitedAt = LocalDateTime.now();

    public enum GuarantorStatus {
        PENDING, SIGNED, DECLINED
    }
}
