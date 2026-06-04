import api from './client';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  department?: string;
  published: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: { id: number; fullName: string; department?: string };
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  department?: string;
  published: boolean;
  pinned: boolean;
}

export const getAnnouncements = () =>
  api.get<Announcement[]>('/announcements');

export const getAdminAnnouncements = () =>
  api.get<Announcement[]>('/announcements/admin');

export const createAnnouncement = (data: AnnouncementPayload) =>
  api.post<Announcement>('/announcements/admin', data);

export const updateAnnouncement = (id: number, data: AnnouncementPayload) =>
  api.put<Announcement>(`/announcements/admin/${id}`, data);

export const toggleAnnouncementPublished = (id: number) =>
  api.post<Announcement>(`/announcements/admin/${id}/toggle-published`);

export const deleteAnnouncement = (id: number) =>
  api.delete(`/announcements/admin/${id}`);
