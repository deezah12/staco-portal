import api from './client';
import { AuthUser, LeaveRequest, LeaveBalance, DashboardStats, LeavePaymentRequest } from '../types';

// -------------------------------------------------------
// AUTH
// -------------------------------------------------------

export const login = (email: string, password: string) =>
  api.post<AuthUser>('/auth/login', { email, password });

export const register = (data: {
  fullName: string; email: string; password: string;
  department?: string; position?: string; role?: string;
}) => api.post<AuthUser>('/auth/register', data);

// -------------------------------------------------------
// EMPLOYEE
// -------------------------------------------------------

/** Apply for leave — multipart: JSON data + handover note file */
export const applyLeave = (
  data: {
    leaveType: string; startDate: string; endDate: string;
    reason?: string; reliefStaffName: string;
  },
  handoverNote: File
) => {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  form.append('handoverNote', handoverNote);
  return api.post<LeaveRequest>('/leave/apply', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getMyRequests = () =>
  api.get<LeaveRequest[]>('/leave/my-requests');

export const cancelLeave = (id: number) =>
  api.post<LeaveRequest>(`/leave/${id}/cancel`);

export const getMyBalance = () =>
  api.get<LeaveBalance>('/leave/balance');

// -------------------------------------------------------
// APPROVER (Unit Head / Div Head)
// -------------------------------------------------------

export const getPendingForApprover = () =>
  api.get<LeaveRequest[]>('/leave/approver/pending');

export const unitHeadReview = (id: number, approved: boolean, comment?: string) =>
  api.post<LeaveRequest>(`/leave/${id}/unit-head-review`, { approved, comment });

export const divHeadReview = (id: number, approved: boolean, comment?: string) =>
  api.post<LeaveRequest>(`/leave/${id}/div-head-review`, { approved, comment });

export const hodConfirmResumption = (leaveRequestId: number) =>
  api.post<LeaveRequest>(`/leave/${leaveRequestId}/hod-confirm-resumption`);

// -------------------------------------------------------
// HR (ADMIN)
// -------------------------------------------------------

export const getPendingHr = () =>
  api.get<LeaveRequest[]>('/leave/hr/pending');

export const getAllRequests = () =>
  api.get<LeaveRequest[]>('/leave/hr/all');

export const hrProcessLeave = (id: number, comment?: string) =>
  api.post<LeaveRequest>(`/leave/hr/${id}/process`, { comment });

export const hrConfirmResumption = (leaveRequestId: number) =>
  api.post<LeaveRequest>(`/leave/hr/${leaveRequestId}/confirm-resumption`);

export const getOverstayedLeaves = () =>
  api.get<LeaveRequest[]>('/leave/hr/overstayed');

export const getDashboardStats = () =>
  api.get<DashboardStats>('/leave/hr/stats');

// -------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------

export const getPendingPayments = () =>
  api.get<LeavePaymentRequest[]>('/leave/accounts/payment-requests');

export const processEop = (id: number, accountNote: string, eopDocument: File) => {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify({ accountNote })], { type: 'application/json' }));
  form.append('eopDocument', eopDocument);
  return api.post<LeavePaymentRequest>(
    `/leave/accounts/payment-requests/${id}/process-eop`, form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};
