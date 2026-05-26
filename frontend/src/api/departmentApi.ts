import api from './client';

export interface Department {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export const getDepartments = () =>
  api.get<Department[]>('/departments');

export const createDepartment = (data: { name: string; description?: string }) =>
  api.post<Department>('/departments', data);

export const updateDepartment = (id: number, data: { name?: string; description?: string }) =>
  api.put<Department>(`/departments/${id}`, data);

export const deactivateDepartment = (id: number) =>
  api.delete(`/departments/${id}`);