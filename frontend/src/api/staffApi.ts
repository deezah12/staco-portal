import api from './client';

// =====================
// 👤 PROFILE (STAFF)
// =====================

export const getProfile = () =>
    api.get('/staff/profile');

export const updateProfile = (data: {
    fullName?: string;
    department?: string;
    position?: string;
    phone?: string;
}) =>
    api.put('/staff/profile', data);

export const changePassword = (data: {
    currentPassword?: string;
    newPassword: string;
}) =>
    api.put('/staff/change-password', data);


// =====================
// 🧑‍💼 ADMIN - STAFF MANAGEMENT
// =====================

export const createStaff = (data: {
    fullName: string;
    email: string;
    temporaryPassword: string;
    department?: string;
    position?: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'ACCOUNT' | 'ADMIN';
    approvalLevel?: 'NONE' | 'UNIT_HEAD' | 'DIV_HEAD' | 'MD';
    gradeId?: number | null;
}) =>
    api.post('/staff/admin/create', data);

export const assignGrade = (id: number, gradeId: number | null) =>
    api.put(`/staff/admin/${id}/grade`, { gradeId });


export const getAllStaff = () =>
    api.get('/staff/admin/all');


export const toggleActive = (id: number) =>
    api.put(`/staff/admin/${id}/toggle-active`);


export const resetPassword = (id: number, data: {
    newPassword: string;
}) =>
    api.put(`/staff/admin/${id}/reset-password`, data);