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
        getProfile()
            .then((res) => {
                setProfile(res.data);
                setPhone(res.data.phone || '');
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSavePhone = async () => {
        setSaving(true);

        try {
            const res = await updateProfile({
                phone,
            });

            setProfile(res.data);

            if (user) {
                login({
                    ...user,
                    fullName: res.data.fullName,
                });
            }

            toast.success('Phone number updated!');
        } catch {
            toast.error('Failed to update phone number');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    const initials = (profile?.fullName || 'U')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const avatarColor = `hsl(${((profile?.id || 1) * 47) % 360}, 65%, 60%)`;

    const subtitle =
        profile?.department === profile?.position
            ? profile?.department
            : `${profile?.department || ''}${
    profile?.position ? ` · ${profile.position}` : ''
}`;

    const cardStyle: React.CSSProperties = {
        background: '#fff',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 4px 20px rgba(15,23,42,0.05)',
        border: '1px solid #eef2f7',
    };

    return (
        <div
            style={{
                maxWidth: 1280,
                margin: '0 auto',
                padding: '10px 8px 40px',
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 42,
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: 6,
                        }}
                    >
                        My Profile
                    </h1>

                    <p
                        style={{
                            color: '#64748b',
                            fontSize: 16,
                        }}
                    >
                        Manage your personal information and account settings
                    </p>
                </div>

                <button
                    className="btn btn-outline"
                    onClick={() => navigate('/change-password')}
                    style={{
                        borderRadius: 14,
                        padding: '12px 18px',
                    }}
                >
                    🔑 Change Password
                </button>
            </div>

            {/* HERO CARD */}
            <div
                style={{
                    ...cardStyle,
                    marginBottom: 24,
                    padding: 32,
                    background:
                        'linear-gradient(135deg, #ffffff 0%, #f8f5ff 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 24,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: 24,
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                background: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 46,
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow:
                                    '0 10px 30px rgba(139,92,246,0.25)',
                            }}
                        >
                            {initials}
                        </div>

                        <div>
                            <h2
                                style={{
                                    fontSize: 38,
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    marginBottom: 10,
                                }}
                            >
                                {profile?.fullName}
                            </h2>

                            <div
                                style={{
                                    color: '#7c3aed',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    marginBottom: 4,
                                }}
                            >
                                {profile?.department}
                            </div>

                            <div
                                style={{
                                    color: '#64748b',
                                    fontSize: 15,
                                    marginBottom: 18,
                                }}
                            >
                                {subtitle}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    color: '#475569',
                                }}
                            >
                                <span>✉️ {profile?.email}</span>
                                <span>📞 {profile?.phone || 'No phone number'}</span>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                padding: '8px 14px',
                                borderRadius: 999,
                                background: '#dbeafe',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: 13,
                                width: 'fit-content',
                            }}
                        >
                            {profile?.role}
                        </div>

                        {profile?.approvalLevel &&
                            profile.approvalLevel !== 'NONE' && (
                                <div
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: 999,
                                        background: '#fef3c7',
                                        color: '#d97706',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        width: 'fit-content',
                                    }}
                                >
                                    {profile.approvalLevel.replace('_', ' ')}
                                </div>
                            )}

                        <div
                            style={{
                                padding: '8px 14px',
                                borderRadius: 999,
                                background: profile?.active
                                    ? '#dcfce7'
                                    : '#fee2e2',
                                color: profile?.active
                                    ? '#16a34a'
                                    : '#dc2626',
                                fontWeight: 700,
                                fontSize: 13,
                                width: 'fit-content',
                            }}
                        >
                            {profile?.active ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 18,
                    marginBottom: 24,
                }}
            >
                <div style={cardStyle}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                        Leave Allowance
                    </div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 800,
                            marginTop: 10,
                            color: '#0f172a',
                        }}
                    >
                        {profile?.leaveAllowanceAmount || 0}
                    </div>

                    <div
                        style={{
                            color: '#16a34a',
                            marginTop: 6,
                            fontWeight: 600,
                        }}
                    >
                        Available Days
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                        Sick Leave
                    </div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 800,
                            marginTop: 10,
                            color: '#0f172a',
                        }}
                    >
                        {profile?.sickLeaveTotal || 0}
                    </div>

                    <div
                        style={{
                            color: '#2563eb',
                            marginTop: 6,
                            fontWeight: 600,
                        }}
                    >
                        Sick Days
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                        Approval Level
                    </div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 800,
                            marginTop: 10,
                            color: '#7c3aed',
                        }}
                    >
                        {profile?.approvalLevel || 'NONE'}
                    </div>

                    <div
                        style={{
                            color: '#64748b',
                            marginTop: 6,
                            fontWeight: 600,
                        }}
                    >
                        Employee Approval Access
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                        Account Status
                    </div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 800,
                            marginTop: 10,
                            color: profile?.active
                                ? '#16a34a'
                                : '#dc2626',
                        }}
                    >
                        {profile?.active ? 'Active' : 'Inactive'}
                    </div>

                    <div
                        style={{
                            color: '#64748b',
                            marginTop: 6,
                            fontWeight: 600,
                        }}
                    >
                        Your account is active
                    </div>
                </div>
            </div>

            {/* ACCOUNT INFO */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'minmax(320px, 1fr) minmax(320px, 1fr)',
                    gap: 24,
                    flexWrap: 'wrap',
                }}
            >
                {/* LEFT */}
                <div style={cardStyle}>
                    <h3
                        style={{
                            fontSize: 24,
                            fontWeight: 800,
                            marginBottom: 8,
                            color: '#0f172a',
                        }}
                    >
                        Personal Information
                    </h3>

                    <p
                        style={{
                            color: '#64748b',
                            marginBottom: 24,
                        }}
                    >
                        Update your phone number only
                    </p>

                    <div className="form-group">
                        <label>Full Name</label>

                        <input
                            value={profile?.fullName || ''}
                            disabled
                            style={{
                                background: '#f8fafc',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>

                        <input
                            value={profile?.email || ''}
                            disabled
                            style={{
                                background: '#f8fafc',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>

                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Department</label>

                        <input
                            value={profile?.department || ''}
                            disabled
                            style={{
                                background: '#f8fafc',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Position</label>

                        <input
                            value={profile?.position || ''}
                            disabled
                            style={{
                                background: '#f8fafc',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleSavePhone}
                        disabled={saving}
                        style={{
                            marginTop: 10,
                            borderRadius: 14,
                            padding: '14px 20px',
                        }}
                    >
                        {saving ? 'Saving...' : '💾 Save Phone Number'}
                    </button>
                </div>

                {/* RIGHT */}
                <div style={cardStyle}>
                    <h3
                        style={{
                            fontSize: 24,
                            fontWeight: 800,
                            marginBottom: 8,
                            color: '#0f172a',
                        }}
                    >
                        Account Information
                    </h3>

                    <p
                        style={{
                            color: '#64748b',
                            marginBottom: 24,
                        }}
                    >
                        Your employee account details
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 18,
                        }}
                    >
                        {[
                            ['Role', profile?.role],
                            ['Approval Level', profile?.approvalLevel],
                            [
                                'Account Status',
                                profile?.active ? 'Active' : 'Inactive',
                            ],
                            [
                                'Must Change Password',
                                profile?.mustChangePassword
                                    ? 'Yes'
                                    : 'No',
                            ],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: 14,
                                    borderBottom:
                                        '1px solid #f1f5f9',
                                }}
                            >
                                <span
                                    style={{
                                        color: '#64748b',
                                        fontWeight: 500,
                                    }}
                                >
                                    {label}
                                </span>

                                <span
                                    style={{
                                        fontWeight: 700,
                                        color: '#0f172a',
                                    }}
                                >
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            marginTop: 40,
                            padding: 20,
                            borderRadius: 18,
                            background:
                                'linear-gradient(135deg,#f8f5ff,#eef2ff)',
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: 18,
                                marginBottom: 8,
                                color: '#0f172a',
                            }}
                        >
                            Keep Your Account Secure
                        </div>

                        <div
                            style={{
                                color: '#64748b',
                                marginBottom: 18,
                                lineHeight: 1.6,
                            }}
                        >
                            Use a strong password and keep your information
                            updated to ensure the security of your account.
                        </div>

                        <button
                            className="btn btn-outline"
                            onClick={() =>
                                navigate('/change-password')
                            }
                            style={{
                                borderRadius: 14,
                                padding: '12px 18px',
                            }}
                        >
                            🔐 Change Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
