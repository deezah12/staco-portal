import api from './client';
import { LoanRequest, LoanGuarantor, LoanRepayment, Grade } from '../types/loan';

// -------------------------------------------------------
// EMPLOYEE
// -------------------------------------------------------

export const applyLoan = (data: {
  amount: number; monthlySalary: number; repaymentMonths: number;
  reason: string; purpose?: string; guarantor1Id: number; guarantor2Id: number;
}) => api.post<LoanRequest>('/loans/apply', data);

export const getMyLoans = () =>
  api.get<LoanRequest[]>('/loans/my-loans');

export const cancelLoan = (id: number) =>
  api.post<LoanRequest>(`/loans/${id}/cancel`);

export const getLoanById = (id: number) =>
  api.get<LoanRequest>(`/loans/${id}`);

export const getRepaymentSchedule = (id: number) =>
  api.get<LoanRepayment[]>(`/loans/${id}/schedule`);

export const getEligibleGuarantors = () =>
  api.get<any[]>('/loans/eligible-guarantors');

// -------------------------------------------------------
// GUARANTOR (in-app)
// -------------------------------------------------------

export const getMyGuarantorRequests = () =>
  api.get<LoanGuarantor[]>('/loans/guarantor/my-requests');

export const getPendingGuarantorRequests = () =>
  api.get<LoanGuarantor[]>('/loans/guarantor/pending');

export const respondAsGuarantor = (loanRequestId: number, accept: boolean, comment?: string) =>
  api.post<LoanGuarantor>('/loans/guarantor/respond', { loanRequestId, accept, comment });

// -------------------------------------------------------
// APPROVER (Unit Head / Div Head / MD)
// -------------------------------------------------------

export const getPendingLoansForApprover = () =>
  api.get<LoanRequest[]>('/loans/approver/pending');

export const unitHeadLoanReview = (id: number, approved: boolean, comment?: string) =>
  api.post<LoanRequest>(`/loans/${id}/unit-head-review`, { approved, comment });

export const divHeadLoanReview = (id: number, approved: boolean, comment?: string) =>
  api.post<LoanRequest>(`/loans/${id}/div-head-review`, { approved, comment });

export const mdLoanReview = (id: number, approved: boolean, comment?: string) =>
  api.post<LoanRequest>(`/loans/${id}/md-review`, { approved, comment });

// -------------------------------------------------------
// HR
// -------------------------------------------------------

export const getPendingHrLoans = () =>
  api.get<LoanRequest[]>('/loans/hr/pending');

export const getAllLoans = () =>
  api.get<LoanRequest[]>('/loans/hr/all');

export const hrProcessLoan = (id: number, comment?: string, disbursementDate?: string, repaymentStartDate?: string) =>
  api.post<LoanRequest>(`/loans/hr/${id}/process`, { comment, disbursementDate, repaymentStartDate });

export const recordRepayment = (loanId: number, repaymentId: number, notes?: string) =>
  api.post<LoanRepayment>(`/loans/hr/${loanId}/repayment`, { repaymentId, notes });

export const getLoanStats = () =>
  api.get('/loans/hr/stats');

// -------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------

export const getPendingDisbursements = () =>
  api.get<LoanRequest[]>('/loans/accounts/pending');

export const disburseLoan = (id: number, note: string, confirmation?: File) => {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify({ note })], { type: 'application/json' }));
  if (confirmation) form.append('confirmation', confirmation);
  return api.post<LoanRequest>(`/loans/accounts/${id}/disburse`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// -------------------------------------------------------
// GRADES
// -------------------------------------------------------

export const getAllGrades = () =>
  api.get<Grade[]>('/loans/grades');

export const createGrade = (data: { name: string; level: number; description?: string }) =>
  api.post<Grade>('/loans/grades', data);

// Legacy alias used in some admin pages
export const getAllEmployees = () =>
  api.get<any[]>('/loans/eligible-guarantors');
