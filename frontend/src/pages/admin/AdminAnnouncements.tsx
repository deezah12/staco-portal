import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getDepartments } from '../../api/departmentApi';
import { getProfile } from '../../api/staffApi';
import {
  Announcement,
  AnnouncementPayload,
  createAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncements,
  toggleAnnouncementPublished,
  updateAnnouncement,
} from '../../api/announcementApi';

const emptyForm: AnnouncementPayload = {
  title: '',
  body: '',
  department: '',
  published: true,
  pinned: false,
};

const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState<AnnouncementPayload>(emptyForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState('');

  const load = async () => {
    try {
      setAuthError('');
      const [a, d] = await Promise.all([
        getAdminAnnouncements(),
        getDepartments().catch(() => ({ data: [] })),
      ]);
      setAnnouncements(Array.isArray(a.data) ? a.data : []);
      setDepartments(Array.isArray(d.data) ? d.data : []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        let message = 'Your session is authenticated, but this account is not authorized to manage announcements.';
        try {
          const profile = await getProfile();
          message += ` The backend currently reports your role as ${profile.data?.role || 'unknown'}.`;
        } catch {
          message += ' The app could not refresh your profile role.';
        }
        message += ' Sign out and sign in again with an Admin / HR account.';
        setAuthError(message);
        toast.error(message);
        return;
      }
      toast.error('Failed to load announcements');
    }
  };

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const startEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      body: announcement.body,
      department: announcement.department || '',
      published: announcement.published,
      pinned: announcement.pinned,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, department: form.department || undefined };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement posted');
      }
      resetForm();
      await load();
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(typeof d === 'string' ? d : d?.error || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (announcement: Announcement) => {
    try {
      await toggleAnnouncementPublished(announcement.id);
      await load();
    } catch {
      toast.error('Failed to update publishing status');
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await deleteAnnouncement(announcement.id);
      toast.success('Announcement deleted');
      await load();
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
  };

  if (loading) return <div className="loading">Loading announcements...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Announcements</h1>
        <p>Post updates employees will see on their dashboard.</p>
      </div>

      {authError && (
        <div style={{ ...card, marginBottom: 18, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <form onSubmit={handleSubmit} style={card}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, color: '#0f172a' }}>{editing ? 'Edit Announcement' : 'Post Announcement'}</h3>

          <label style={labelStyle}>Title</label>
          <input value={form.title} maxLength={160} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                 placeholder="e.g. Public holiday notice" style={inputStyle} />

          <label style={labelStyle}>Message</label>
          <textarea value={form.body} maxLength={2000} rows={7} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Write the announcement employees should see" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: -8, marginBottom: 10 }}>{form.body.length}/2000</div>

          <label style={labelStyle}>Audience</label>
          <select value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 14, margin: '12px 0 18px', flexWrap: 'wrap' }}>
            <label style={checkStyle}><input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} /> Published</label>
            <label style={checkStyle}><input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} /> Pin to top</label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {editing && <button type="button" onClick={resetForm} style={secondaryBtn}>Cancel</button>}
            <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Post Announcement'}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.length === 0 ? (
            <div style={card}>No announcements yet.</div>
          ) : announcements.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{a.title}</h3>
                    {a.pinned && <span style={badge('#fef3c7', '#b45309')}>Pinned</span>}
                    <span style={badge(a.published ? '#dcfce7' : '#f1f5f9', a.published ? '#15803d' : '#64748b')}>{a.published ? 'Published' : 'Draft'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {a.department || 'All departments'} - {format(new Date(a.createdAt), 'MMM d, yyyy')}
                  </div>
                  <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{a.body}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(a)} style={secondaryBtn}>Edit</button>
                  <button onClick={() => handleToggle(a)} style={secondaryBtn}>{a.published ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => handleDelete(a)} style={{ ...secondaryBtn, color: '#dc2626' }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '12px 0 6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const checkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', fontWeight: 600 };
const primaryBtn: React.CSSProperties = { flex: 1, padding: '10px 14px', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '8px 11px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const badge = (bg: string, color: string): React.CSSProperties => ({ background: bg, color, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 });

export default AdminAnnouncements;
