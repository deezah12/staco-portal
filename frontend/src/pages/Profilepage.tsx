import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../api/staffApi';
import { getDepartments, Department } from '../api/departmentApi';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ fullName:'', department:'', position:'', phone:'' });

    useEffect(() => {
        Promise.all([getProfile(), getDepartments()]).then(([p, d]) => {
            setProfile(p.data);
            setDepartments(d.data);
            setForm({ fullName: p.data.fullName || '', department: p.data.department || '', position: p.data.position || '', phone: p.data.phone || '' });
        }).finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await updateProfile(form);
            setProfile(res.data);
            // Update auth context name
            if (user) login({ ...user, fullName: res.data.fullName });
            toast.success('Profile updated!');
        } catch { toast.error('Failed to update profile'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="loading"><div className="spinner"/></div>;

    const initials = (profile?.fullName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
    const avatarColor = `hsl(${((profile?.id || 1) * 47) % 360}, 60%, 65%)`;

    return (
        <div style={{ maxWidth:600 }}>
            <div className="page-header">
                <h1>My Profile</h1>
                <p>Update your personal information</p>
            </div>

            {/* Avatar */}
            <div className="card" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:20 }}>
                <div style={{ width:72, height:72, borderRadius:'50%', background:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#fff', flexShrink:0 }}>
                    {initials}
                </div>
                <div>
                    <div style={{ fontWeight:700, fontSize:20 }}>{profile?.fullName}</div>
                    <div style={{ fontSize:13, color:'#64748b' }}>{profile?.email}</div>
                    <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>
                        {profile?.department && <span>{profile.department}</span>}
                        {profile?.department && profile?.position && <span> · </span>}
                        {profile?.position && <span>{profile.position}</span>}
                    </div>
                    {profile?.phone && <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>{profile.phone}</div>}
                    <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: profile?.role === 'ADMIN' ? '#ede9fe' : '#dbeafe', color: profile?.role === 'ADMIN' ? '#7c3aed' : '#1d4ed8' }}>{profile?.role}</span>
                        {profile?.approvalLevel && profile.approvalLevel !== 'NONE' && (
                            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#fef3c7', color:'#d97706' }}>{profile.approvalLevel.replace('_', ' ')}</span>
                        )}
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#dcfce7', color:'#16a34a' }}>{profile?.active ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
            </div>

            {/* Edit form */}
            <div className="card" style={{ marginBottom:16 }}>
                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Edit Information</h3>
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input value={form.fullName} onChange={e => setForm(f => ({...f, fullName:e.target.value}))} placeholder="Your full name" />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input value={form.phone} onChange={e => setForm(f => ({...f, phone:e.target.value}))} placeholder="+234..." />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Department</label>
                            <select value={form.department} onChange={e => setForm(f => ({...f, department:e.target.value}))}>
                                <option value="">— Select department —</option>
                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Position</label>
                            <input value={form.position} onChange={e => setForm(f => ({...f, position:e.target.value}))} placeholder="Developer" />
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
                        <button type="button" className="btn btn-outline" onClick={() => navigate('/change-password')}>🔑 Change Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;