import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../api/staffApi';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [phone, setPhone] = useState('');

    useEffect(() => {
        getProfile().then((res) => {
            setProfile(res.data);
            setPhone(res.data.phone || '');
            console.log('Profile data:', res.data);
            console.log('Manager:', res.data.manager);
            console.log('Grade:', res.data.grade);
        }).finally(() => setLoading(false));
    }, []);

    const handleSavePhone = async () => {
        setSaving(true);
        try {
            const res = await updateProfile({ phone });
            setProfile(res.data);
            if (user) login({ ...user, fullName: res.data.fullName });
            toast.success('Phone number updated!');
        } catch {
            toast.error('Failed to update phone number');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const initials = (profile?.fullName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarColor = `hsl(${((profile?.id || 1) * 47) % 360}, 65%, 55%)`;
    const positionDisplay = profile?.position && profile.position !== profile?.department ? profile.position : null;

    const approvalLabelMap: Record<string, string> = {
        NONE: 'None', UNIT_HEAD: 'Level 1 Approver', DIV_HEAD: 'Level 2 Approver', MD: 'Managing Director',
    };

    const managerName = profile?.manager?.fullName;
    const managerInitials = managerName ? managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : null;
    const managerAvatarColor = `hsl(${((profile?.manager?.id || 2) * 47) % 360}, 65%, 55%)`;

    const createdAt = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const card: React.CSSProperties = {
        background: '#fff', borderRadius: 20, padding: 24,
        border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
    };

    const pill = (bg: string, color: string, text: string) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 700 }}>
            {text}
        </span>
    );

    const infoRow = (iconPath: string, label: string, value: React.ReactNode, last = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: last ? 'none' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={iconPath} />
                </svg>
                {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', textAlign: 'right', maxWidth: '55%' }}>{value}</div>
        </div>
    );

    return (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 8px 48px' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>My Profile</h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Manage your personal information and account settings</p>
                </div>
                <button onClick={() => navigate('/change-password')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    🔑 Change Password
                </button>
            </div>

            {/* HERO CARD */}
            <div style={{ ...card, marginBottom: 20, padding: '24px 28px', background: 'linear-gradient(135deg,#ffffff 0%,#f5f3ff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>

                    {/* Avatar + name + meta */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 96, height: 96, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 34, fontWeight: 800, boxShadow: '0 6px 20px rgba(124,58,237,0.18)' }}>
                                {initials}
                            </div>
                        </div>
                        <div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{profile?.fullName}</h2>
                            <div style={{ color: '#7c3aed', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{profile?.department}{positionDisplay ? ` · ${positionDisplay}` : ''}</div>

                            {/* Grade — single badge, hero only */}
                            {profile?.grade && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 600, border: '1px solid #bbf7d0', marginBottom: 10 }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                    {profile.grade.name} · L{profile.grade.level}
                                </span>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569', fontSize: 13 }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    {profile?.email}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569', fontSize: 13 }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.6 4.9 2 2 0 0 1 3.58 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l1.87-1.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    {profile?.phone || 'No phone number'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Badges + IDs */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {pill('#dbeafe', '#1d4ed8', `👤 ${profile?.role}`)}
                            {profile?.approvalLevel && profile.approvalLevel !== 'NONE' && pill('#fef3c7', '#d97706', `⭐ ${approvalLabelMap[profile.approvalLevel]}`)}
                            {pill(profile?.active ? '#dcfce7' : '#fee2e2', profile?.active ? '#16a34a' : '#dc2626', profile?.active ? '● Active' : '○ Inactive')}
                        </div>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Employee Since</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{createdAt}</div>
                            </div>
                            <div style={{ width: 1, background: '#e2e8f0' }} />
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Employee ID</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>#{String(profile?.id || '').padStart(4, '0')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                {([
                    { bg: '#dcfce7', ic: '#16a34a', path: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', label: 'Leave Balance', value: `${profile?.leaveAllowanceAmount ?? 0}`, sub: 'days available' },
                    { bg: '#dbeafe', ic: '#2563eb', path: 'M22 12h-4l-3 9L9 3l-3 9H2', label: 'Sick Leave', value: `${profile?.sickLeaveTotal ?? 0}`, sub: 'days total' },
                    { bg: '#ede9fe', ic: '#7c3aed', path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', label: 'Approval Level', value: approvalLabelMap[profile?.approvalLevel] || 'None', sub: 'access level' },
                    { bg: profile?.active ? '#dcfce7' : '#fee2e2', ic: profile?.active ? '#16a34a' : '#dc2626', path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3', label: 'Account Status', value: profile?.active ? 'Active' : 'Inactive', sub: 'account state' },
                ] as any[]).map((s, i) => (
                    <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.path}/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 1 }}>{s.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.ic, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTTOM GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>

                {/* LEFT — Edit */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Edit Information</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>Only phone number is editable</div>
                        </div>
                    </div>
                    <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {([
                            { label: 'Full Name', value: profile?.fullName || '', editable: false },
                            { label: 'Phone', value: phone, editable: true },
                            { label: 'Department', value: profile?.department || '', editable: false },
                            { label: 'Position', value: positionDisplay || profile?.position || '', editable: false },
                        ] as any[]).map((f, i) => (
                            <div key={i}>
                                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 5 }}>{f.label}</div>
                                <input
                                    value={f.value}
                                    disabled={!f.editable}
                                    onChange={f.editable ? (e) => setPhone(e.target.value) : undefined}
                                    placeholder={f.editable ? '+234 800 000 0000' : undefined}
                                    style={{
                                        width: '100%', padding: '9px 12px', borderRadius: 10,
                                        border: '1px solid #e2e8f0', fontSize: 13,
                                        color: f.editable ? '#0f172a' : '#94a3b8',
                                        background: f.editable ? '#fff' : '#f8fafc',
                                        cursor: f.editable ? 'text' : 'not-allowed',
                                        outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleSavePhone} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, background: saving ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={() => navigate('/change-password')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Change Password
                        </button>
                    </div>
                </div>

                {/* RIGHT — Account Info */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Account Information</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>Your account and employment details</div>
                        </div>
                    </div>
                    <div style={{ height: 1, background: '#f1f5f9', marginBottom: 4 }} />

                    {infoRow('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'Email', <span style={{ color: '#475569' }}>{profile?.email}</span>)}
                    {infoRow('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'Role', pill('#dbeafe', '#1d4ed8', profile?.role || '—'))}
                    {infoRow('M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', 'Approval Level',
                        profile?.approvalLevel && profile.approvalLevel !== 'NONE'
                            ? pill('#fef3c7', '#d97706', approvalLabelMap[profile.approvalLevel])
                            : <span style={{ color: '#94a3b8' }}>None</span>
                    )}
                    {infoRow('M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', 'Grade',
                        profile?.grade
                            ? pill('#f0fdf4', '#15803d', `${profile.grade.name} · L${profile.grade.level}`)
                            : <span style={{ color: '#94a3b8' }}>Not assigned</span>
                    )}
                    {infoRow('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', 'Reports To',
                        managerName
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: managerAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{managerInitials}</div>
                                <span>{managerName}</span>
                            </div>
                            : <span style={{ color: '#94a3b8' }}>Not assigned</span>
                    )}
                    {infoRow('M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3', 'Status', pill(profile?.active ? '#dcfce7' : '#fee2e2', profile?.active ? '#16a34a' : '#dc2626', profile?.active ? 'Active' : 'Inactive'))}
                    {infoRow('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'Date Created', <span style={{ color: '#475569' }}>{createdAt}</span>)}
                    {infoRow('M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z', 'Must Change Password',
                        profile?.mustChangePassword ? pill('#fee2e2', '#dc2626', 'Yes') : pill('#dcfce7', '#16a34a', 'No'), true
                    )}

                    <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 3 }}>Keep your account secure</div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Use a strong password and keep your information up to date.</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;