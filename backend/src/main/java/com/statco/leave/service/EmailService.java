package com.statco.leave.service;

import com.statco.leave.model.LeavePaymentRequest;
import com.statco.leave.model.LeaveRequest;
import com.statco.leave.model.LoanGuarantor;
import com.statco.leave.model.LoanRequest;
import com.statco.leave.model.User;
import java.util.List;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:Statco HR Portal}")
    private String appName;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // -------------------------------------------------------
    // Leave confirmation (sent when HR processes)
    // -------------------------------------------------------

    public void sendLeaveConfirmation(LeaveRequest leave) {
        String employeeName = leave.getEmployee().getFullName();
        String start        = leave.getStartDate().format(DATE_FMT);
        String end          = leave.getEndDate().format(DATE_FMT);
        String resumption   = leave.getEndDate().plusDays(1).format(DATE_FMT);

        String subject = "[" + appName + "] Your Leave Request Has Been Approved";
        String body = "Dear " + employeeName + ",\n\n"
                + "Your " + formatLeaveType(leave.getLeaveType()) + " request has been approved.\n\n"
                + "Leave Period : " + start + " to " + end + "\n"
                + "Total Days   : " + leave.getTotalDays() + " day(s)\n"
                + "Resumption   : " + resumption + "\n\n"
                + "Please ensure your handover is complete before proceeding on leave.\n\n"
                + "--- OUT OF OFFICE SUGGESTION ---\n"
                + "You may copy the text below to set your out-of-office reply:\n\n"
                + "\"Thank you for your email. I am currently on leave from " + start
                + " to " + end + " and will resume on " + resumption + ". "
                + "For urgent matters, please contact " + leave.getReliefStaffName() + ".\"\n\n"
                + "Regards,\n" + appName;

        // Generate .ics calendar event
        byte[] icsData = generateIcsEvent(
                "On Leave - " + employeeName,
                leave.getStartDate().toString(),
                leave.getEndDate().plusDays(1).toString(), // ICS end date is exclusive
                "Leave approved via " + appName
        );

        sendWithAttachment(leave.getEmployee().getEmail(), subject, body, "leave-calendar.ics", icsData);
    }

    // -------------------------------------------------------
    // Approval request (sent to each approver)
    // -------------------------------------------------------

    public void sendApprovalRequest(LeaveRequest leave, User approver, String approverTitle) {
        String subject = "[" + appName + "] Leave Approval Required — " + leave.getEmployee().getFullName();
        String body = "Dear " + approver.getFullName() + ",\n\n"
                + leave.getEmployee().getFullName() + " has applied for "
                + formatLeaveType(leave.getLeaveType()) + ".\n\n"
                + "Period      : " + leave.getStartDate().format(DATE_FMT)
                + " to " + leave.getEndDate().format(DATE_FMT) + "\n"
                + "Days        : " + leave.getTotalDays() + "\n"
                + "Relief Staff: " + leave.getReliefStaffName() + "\n"
                + "Reason      : " + (leave.getReason() != null ? leave.getReason() : "N/A") + "\n\n"
                + "Please log in to the HR Portal to review this request.\n\n"
                + "Regards,\n" + appName;

        sendRaw(approver.getEmail(), subject, body);
    }

    // -------------------------------------------------------
    // Rejection notification
    // -------------------------------------------------------

    public void sendLeaveRejected(LeaveRequest leave, String rejectedBy, String comment) {
        String subject = "[" + appName + "] Your Leave Request Was Not Approved";
        String body = "Dear " + leave.getEmployee().getFullName() + ",\n\n"
                + "Your " + formatLeaveType(leave.getLeaveType()) + " request ("
                + leave.getStartDate().format(DATE_FMT) + " to " + leave.getEndDate().format(DATE_FMT)
                + ") was not approved by the " + rejectedBy + ".\n\n"
                + "Comment: " + (comment != null ? comment : "No comment provided") + "\n\n"
                + "Please contact HR if you have questions.\n\n"
                + "Regards,\n" + appName;

        sendRaw(leave.getEmployee().getEmail(), subject, body);
    }

    // -------------------------------------------------------
    // 2-day reminder (employee + HOD)
    // -------------------------------------------------------

    public void sendTwoDayReminder(LeaveRequest leave) {
        String resumption = leave.getEndDate().plusDays(1).format(DATE_FMT);
        String employeeName = leave.getEmployee().getFullName();

        // Email to employee
        String empSubject = "[" + appName + "] Reminder: You Resume in 2 Days";
        String empBody = "Dear " + employeeName + ",\n\n"
                + "This is a reminder that your leave ends on " + leave.getEndDate().format(DATE_FMT)
                + " and your resumption date is " + resumption + ".\n\n"
                + "Please ensure your handover note is up to date.\n\n"
                + "Regards,\n" + appName;
        sendRaw(leave.getEmployee().getEmail(), empSubject, empBody);

        // Email to HOD (Unit Head of department)
        String hodSubject = "[" + appName + "] Reminder: " + employeeName + " Resumes in 2 Days";
        String hodBody = "Dear Head of Department,\n\n"
                + employeeName + " is due to resume from leave on " + resumption + ".\n\n"
                + "Please prepare to receive them back.\n\n"
                + "Regards,\n" + appName;

        // Send to both Unit Head and Div Head of the department
        sendRaw(leave.getEmployee().getEmail(), hodSubject, hodBody); // placeholder — HOD lookup in service
    }

    // -------------------------------------------------------
    // Resumption day reminder (employee + HOD + HR)
    // -------------------------------------------------------

    public void sendResumptionDayReminder(LeaveRequest leave) {
        String employeeName = leave.getEmployee().getFullName();
        String today = leave.getEndDate().plusDays(1).format(DATE_FMT);

        // Employee
        String empSubject = "[" + appName + "] Welcome Back!";
        String empBody = "Dear " + employeeName + ",\n\n"
                + "Welcome back! Today, " + today + ", marks your return from leave.\n\n"
                + "We hope you had a restful break. Please check in with HR upon resumption.\n\n"
                + "Regards,\n" + appName;
        sendRaw(leave.getEmployee().getEmail(), empSubject, empBody);
    }

    // -------------------------------------------------------
    // Welcome back (sent when both HR + HOD confirm resumption)
    // -------------------------------------------------------

    public void sendWelcomeBack(LeaveRequest leave) {
        String employeeName = leave.getEmployee().getFullName();
        String subject = "[" + appName + "] " + employeeName + " Has Resumed";
        String body = "Dear Team,\n\n"
                + "Please be informed that " + employeeName + " has officially resumed from "
                + formatLeaveType(leave.getLeaveType()) + " and is back at work today.\n\n"
                + "Welcome back, " + employeeName + "!\n\n"
                + "Regards,\n" + appName;

        // Sent to employee, HOD, and HR — wired in service layer
        sendRaw(leave.getEmployee().getEmail(), subject, body);
    }

    // -------------------------------------------------------
    // Payment request notification to Accounts
    // -------------------------------------------------------

    public void sendPaymentRequestNotification(LeavePaymentRequest payment, User accountUser) {
        String subject = "[" + appName + "] Leave Payment Request — " + payment.getEmployee().getFullName();
        String body = "Dear " + accountUser.getFullName() + ",\n\n"
                + "A leave payment request has been raised by HR for the following:\n\n"
                + "Employee   : " + payment.getEmployee().getFullName() + "\n"
                + "Leave Type : Annual Leave\n"
                + "Amount     : ₦" + String.format("%,.2f", payment.getAmount()) + "\n"
                + "Note       : " + payment.getHrNote() + "\n\n"
                + "Please log in to the HR Portal to process this payment and upload the EOP document.\n\n"
                + "Regards,\n" + appName;

        sendRaw(accountUser.getEmail(), subject, body);
    }

    // -------------------------------------------------------
    // Loan emails
    // -------------------------------------------------------

    public void sendGuarantorInvite(LoanRequest loan, User guarantor) {
        String subject = "[" + appName + "] Loan Guarantor Request from " + loan.getEmployee().getFullName();
        String body = "Dear " + guarantor.getFullName() + ",\n\n"
                + loan.getEmployee().getFullName() + " has requested you as a guarantor for a loan of ₦"
                + String.format("%,.2f", loan.getAmount()) + ".\n\n"
                + "Please log in to the HR Portal to accept or decline this request.\n\n"
                + "Regards,\n" + appName;
        sendRaw(guarantor.getEmail(), subject, body);
    }

    public void sendLoanRejected(LoanRequest loan, String reason) {
        String subject = "[" + appName + "] Your Loan Request Was Not Approved";
        String body = "Dear " + loan.getEmployee().getFullName() + ",\n\n"
                + "Your loan request of ₦" + String.format("%,.2f", loan.getAmount()) + " was not approved.\n\n"
                + "Reason: " + (reason != null ? reason : "No reason provided") + "\n\n"
                + "Please contact HR if you have questions.\n\n"
                + "Regards,\n" + appName;
        sendRaw(loan.getEmployee().getEmail(), subject, body);
    }

    public void sendLoanApprovalRequest(LoanRequest loan, User approver, String approverTitle) {
        String subject = "[" + appName + "] Loan Approval Required — " + loan.getEmployee().getFullName();
        String body = "Dear " + approver.getFullName() + ",\n\n"
                + loan.getEmployee().getFullName() + " has a loan request of ₦"
                + String.format("%,.2f", loan.getAmount()) + " awaiting your approval as " + approverTitle + ".\n\n"
                + "Please log in to the HR Portal to review.\n\n"
                + "Regards,\n" + appName;
        sendRaw(approver.getEmail(), subject, body);
    }

    public void sendLoanDisbursementRequest(LoanRequest loan, User accountUser) {
        String subject = "[" + appName + "] Loan Disbursement Required — " + loan.getEmployee().getFullName();
        String body = "Dear " + accountUser.getFullName() + ",\n\n"
                + "A loan of ₦" + String.format("%,.2f", loan.getAmount()) + " for "
                + loan.getEmployee().getFullName() + " has been approved and is ready for disbursement.\n\n"
                + "Please log in to the HR Portal to process the disbursement.\n\n"
                + "Regards,\n" + appName;
        sendRaw(accountUser.getEmail(), subject, body);
    }

    public void sendLoanDisbursed(LoanRequest loan) {
        String subject = "[" + appName + "] Your Loan Has Been Disbursed";
        String body = "Dear " + loan.getEmployee().getFullName() + ",\n\n"
                + "Your loan of ₦" + String.format("%,.2f", loan.getAmount()) + " has been disbursed.\n\n"
                + "Repayment starts on " + (loan.getRepaymentStartDate() != null ? loan.getRepaymentStartDate() : "as scheduled")
                + " with monthly deductions of ₦" + String.format("%,.2f", loan.getMonthlyDeduction()) + ".\n\n"
                + "Regards,\n" + appName;
        sendRaw(loan.getEmployee().getEmail(), subject, body);
    }

    public void sendLoanOverdueNotification(LoanRequest loan, List<LoanGuarantor> guarantors) {
        String subject = "[" + appName + "] Overdue Loan Repayment — " + loan.getEmployee().getFullName();
        String empBody = "Dear " + loan.getEmployee().getFullName() + ",\n\n"
                + "You have an overdue loan repayment. Outstanding balance: ₦"
                + String.format("%,.2f", loan.getOutstandingBalance()) + ".\n\n"
                + "Please contact HR immediately to resolve this.\n\n"
                + "Regards,\n" + appName;
        sendRaw(loan.getEmployee().getEmail(), subject, empBody);

        for (LoanGuarantor g : guarantors) {
            String gBody = "Dear " + g.getGuarantor().getFullName() + ",\n\n"
                    + "Please be informed that " + loan.getEmployee().getFullName()
                    + " has an overdue loan repayment of ₦" + String.format("%,.2f", loan.getOutstandingBalance())
                    + " for which you are a guarantor.\n\n"
                    + "Regards,\n" + appName;
            sendRaw(g.getGuarantor().getEmail(), subject, gBody);
        }
    }

    // -------------------------------------------------------
    // Generic raw send
    // -------------------------------------------------------

    public void sendRaw(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    // -------------------------------------------------------
    // Send with .ics attachment
    // -------------------------------------------------------

    private void sendWithAttachment(String to, String subject, String body,
                                    String attachmentName, byte[] attachmentData) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            helper.addAttachment(attachmentName, new ByteArrayResource(attachmentData), "text/calendar");
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email with attachment to {}: {}", to, e.getMessage());
        }
    }

    // -------------------------------------------------------
    // .ics Calendar Event Generator
    // -------------------------------------------------------

    private byte[] generateIcsEvent(String summary, String startDate, String endDate, String description) {
        // startDate and endDate in yyyy-MM-dd format; endDate is exclusive in ICS all-day events
        String icsContent = "BEGIN:VCALENDAR\r\n"
                + "VERSION:2.0\r\n"
                + "PRODID:-//" + appName + "//EN\r\n"
                + "METHOD:PUBLISH\r\n"
                + "BEGIN:VEVENT\r\n"
                + "UID:" + java.util.UUID.randomUUID() + "@statco.com\r\n"
                + "DTSTART;VALUE=DATE:" + startDate.replace("-", "") + "\r\n"
                + "DTEND;VALUE=DATE:" + endDate.replace("-", "") + "\r\n"
                + "SUMMARY:" + summary + "\r\n"
                + "DESCRIPTION:" + description + "\r\n"
                + "STATUS:CONFIRMED\r\n"
                + "TRANSP:OPAQUE\r\n"
                + "END:VEVENT\r\n"
                + "END:VCALENDAR\r\n";
        return icsContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String formatLeaveType(LeaveRequest.LeaveType type) {
        return switch (type) {
            case ANNUAL    -> "Annual Leave";
            case SICK      -> "Sick Leave";
            case CASUAL    -> "Casual Leave";
            case EXAM      -> "Exam Leave";
            case MATERNITY -> "Maternity Leave";
            case PATERNITY -> "Paternity Leave";
            case UNPAID    -> "Unpaid Leave";
            case OTHER     -> "Other Leave";
        };
    }
}
