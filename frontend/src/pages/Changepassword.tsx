import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { changePassword } from '../api/staffApi';
import { useAuth } from '../context/AuthContext';

const ChangePassword: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
    const [loading, setLoading] = useState(false);

    const isForced = user?.mustChangePassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }
        if (form.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            const res = await changePassword({currentPassword: isForced ? undefined : form.current, newPassword: form.newPass,});
            login(res.data);
            toast.success('Password changed successfully!');
            navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard');
        } catch (err: any) {
            const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to change password');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: 440 }}>
                <div className="auth-logo">
                    <h2>Statco <span>HR</span></h2>
                </div>

                {isForced ? (
                    <>
                        <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13 }}>
                            ⚠️ <strong>Action Required:</strong> You must set a new password before continuing.
                        </div>
                        <h1 style={{ marginBottom:4 }}>Set Your Password</h1>
                        <p style={{ marginBottom:24 }}>Your account was created with a temporary password. Please set a permanent one.</p>
                    </>
                ) : (
                    <>
                        <h1 style={{ marginBottom:4 }}>Change Password</h1>
                        <p style={{ marginBottom:24 }}>Update your account password below.</p>
                    </>
                )}

                <form onSubmit={handleSubmit}>
                    {!isForced && (
                        <div className="form-group">
                            <label>Current Password</label>
                            <input type="password" value={form.current} onChange={e => setForm(f => ({...f, current:e.target.value}))} required placeholder="••••••••" />
                        </div>
                    )}
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" value={form.newPass} onChange={e => setForm(f => ({...f, newPass:e.target.value}))} required placeholder="Min 6 characters" minLength={6} />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" value={form.confirm} onChange={e => setForm(f => ({...f, confirm:e.target.value}))} required placeholder="Repeat new password" />
                    </div>

                    {/* Strength indicator */}
                    {form.newPass.length > 0 && (
                        <div style={{ marginBottom:16 }}>
                            <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                                {[1,2,3,4].map(i => (
                                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background:
                                            form.newPass.length >= i * 3 ? (i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#22c55e' : '#16a34a') : '#e2e8f0'
                                    }}/>
                                ))}
                            </div>
                            <div style={{ fontSize:11, color:'#64748b' }}>
                                {form.newPass.length < 6 ? 'Too short' : form.newPass.length < 9 ? 'Fair' : form.newPass.length < 12 ? 'Good' : 'Strong'}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
                        {loading ? 'Saving...' : '🔐 Set New Password'}
                    </button>

                    {!isForced && (
                        <button type="button" className="btn btn-outline" style={{ width:'100%', justifyContent:'center', marginTop:10 }}
                                onClick={() => navigate(-1)}>Cancel</button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;