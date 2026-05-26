export type LoanStatus =
  | 'PENDING_GUARANTORS'
  | 'PENDING_UNIT_HEAD'
  | 'PENDING_DIV_HEAD'
  | 'PENDING_MD'
  | 'APPROVED'
  | 'PROCESSING'
  | 'DISBURSED'
  | 'OVERDUE'
  | 'FULLY_REPAID'
  | 'REJECTED'
  | 'CANCELLED';

export type GuarantorStatus = 'PENDING' | 'SIGNED' | 'DECLINED';
export type RepaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type ApprovalStatus  = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface Grade {
  id: number;
  name: string;
  level: number;
  description?: string;
}

export interface LoanGuarantor {
  id: number;
  guarantor: { id: number; fullName: string; department?: string; grade?: Grade };
  slotNumber: number;
  status: GuarantorStatus;
  comment?: string;
  respondedAt?: string;
  invitedAt: string;
  loanRequest?: LoanRequest;
}

export interface LoanRepayment {
  id: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: RepaymentStatus;
  notes?: string;
}

export interface LoanRequest {
  id: number;
  employee: { id: number; fullName: string; email: string; department: string; grade?: Grade };
  amount: number;
  monthlySalary: number;
  repaymentMonths: number;
  monthlyDeduction: number;
  reason: string;
  purpose?: string;
  status: LoanStatus;

  // Approval trail
  unitHeadStatus: ApprovalStatus;
  unitHeadReviewer?: { fullName: string };
  unitHeadComment?: string;
  unitHeadReviewedAt?: string;

  divHeadStatus: ApprovalStatus;
  divHeadReviewer?: { fullName: string };
  divHeadComment?: string;
  divHeadReviewedAt?: string;

  mdStatus: ApprovalStatus;
  mdReviewer?: { fullName: string };
  mdComment?: string;
  mdReviewedAt?: string;

  hrProcessor?: { fullName: string };
  hrComment?: string;
  hrProcessedAt?: string;

  disbursedBy?: { fullName: string };
  disbursementDate?: string;
  repaymentStartDate?: string;

  outstandingBalance: number;
  fullyRepaid: boolean;
  hasOverdueInstallment: boolean;

  guarantors: LoanGuarantor[];
  repayments?: LoanRepayment[];
  createdAt: string;
}

// -------------------------------------------------------
// Display helpers
// -------------------------------------------------------

export const loanStatusMeta: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  PENDING_GUARANTORS: { label: '⏳ Awaiting Guarantors', color: '#d97706', bg: '#fef3c7' },
  PENDING_UNIT_HEAD:  { label: '👤 Awaiting Unit Head',  color: '#7c3aed', bg: '#ede9fe' },
  PENDING_DIV_HEAD:   { label: '👥 Awaiting Div Head',   color: '#1d4ed8', bg: '#dbeafe' },
  PENDING_MD:         { label: '🏢 Awaiting MD',         color: '#0e7490', bg: '#cffafe' },
  APPROVED:           { label: '✅ Approved',             color: '#16a34a', bg: '#dcfce7' },
  PROCESSING:         { label: '⚙️ Processing',           color: '#ea580c', bg: '#ffedd5' },
  DISBURSED:          { label: '💸 Disbursed',            color: '#059669', bg: '#d1fae5' },
  OVERDUE:            { label: '🔴 Overdue',              color: '#dc2626', bg: '#fee2e2' },
  FULLY_REPAID:       { label: '🎉 Fully Repaid',         color: '#0891b2', bg: '#e0f2fe' },
  REJECTED:           { label: '❌ Rejected',             color: '#dc2626', bg: '#fee2e2' },
  CANCELLED:          { label: '🚫 Cancelled',            color: '#64748b', bg: '#f1f5f9' },
};

export const REPAYMENT_DURATIONS = [3, 6, 9, 12];
