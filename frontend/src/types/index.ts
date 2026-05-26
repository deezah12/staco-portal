export type Role = 'ADMIN' | 'EMPLOYEE' | 'ACCOUNT';
export type ApprovalLevel = 'NONE' | 'UNIT_HEAD' | 'DIV_HEAD' | 'MD';

export type LeaveType = 'ANNUAL' | 'SICK' | 'CASUAL' | 'EXAM' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
export type LeaveStatus =
  | 'PENDING_UNIT_HEAD'
  | 'PENDING_DIV_HEAD'
  | 'PENDING_HR'
  | 'ACTIVE'
  | 'RESUMED'
  | 'REJECTED'
  | 'CANCELLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface AuthUser {
  token: string;
  email: string;
  fullName: string;
  role: Role;
  approvalLevel: ApprovalLevel;
  userId: number;
  mustChangePassword: boolean;
}

export interface LeaveRequest {
  id: number;
  employee: { id: number; fullName: string; email: string; department: string };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  reliefStaffName: string;
  handoverNoteFileName?: string;
  status: LeaveStatus;

  // Level 1
  unitHeadStatus: ApprovalStatus;
  unitHeadReviewer?: { fullName: string };
  unitHeadComment?: string;
  unitHeadReviewedAt?: string;

  // Level 2
  divHeadStatus: ApprovalStatus;
  divHeadReviewer?: { fullName: string };
  divHeadComment?: string;
  divHeadReviewedAt?: string;

  // Level 3 (HR)
  hrStatus: ApprovalStatus;
  hrProcessor?: { fullName: string };
  hrComment?: string;
  hrProcessedAt?: string;

  // Payment
  paymentApplicable: boolean;
  paymentRequestSent: boolean;

  // Resumption
  resumedConfirmedByHr: boolean;
  resumedConfirmedByHod: boolean;
  resumedAt?: string;

  createdAt: string;
}

export interface LeaveBalance {
  annualTotal: number; annualUsed: number; annualRemaining: number;
  sickTotal: number; sickUsed: number; sickRemaining: number;
  casualTotal: number; casualUsed: number; casualRemaining: number;
  examTotal: number; examUsed: number; examRemaining: number;
  maternityTotal: number; maternityUsed: number; maternityRemaining: number;
  paternityTotal: number; paternityUsed: number; paternityRemaining: number;
  unpaidUsed: number;
}

export interface LeavePaymentRequest {
  id: number;
  leaveRequest: LeaveRequest;
  employee: { id: number; fullName: string; department: string };
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'CANCELLED';
  hrNote?: string;
  createdAt: string;
  eopDocumentFileName?: string;
  processedAt?: string;
  accountNote?: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  activeLeaves: number;
  overstayed: number;
  totalEmployees: number;
}

// Helper: human-readable leave type
export const leaveTypeLabel: Record<LeaveType, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  CASUAL: 'Casual Leave',
  EXAM: 'Exam Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  UNPAID: 'Unpaid Leave',
  OTHER: 'Other Leave',
};

// Helper: status badge colour key
export const statusBadgeClass: Record<LeaveStatus, string> = {
  PENDING_UNIT_HEAD: 'badge-pending',
  PENDING_DIV_HEAD:  'badge-pending',
  PENDING_HR:        'badge-pending',
  ACTIVE:            'badge-approved',
  RESUMED:           'badge-approved',
  REJECTED:          'badge-rejected',
  CANCELLED:         'badge-cancelled',
};

export const statusLabel: Record<LeaveStatus, string> = {
  PENDING_UNIT_HEAD: 'Pending Unit Head',
  PENDING_DIV_HEAD:  'Pending Div Head',
  PENDING_HR:        'Pending HR',
  ACTIVE:            'Active',
  RESUMED:           'Resumed',
  REJECTED:          'Rejected',
  CANCELLED:         'Cancelled',
};
