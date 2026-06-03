import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyRequests, getMyBalance } from '../../api/leaveApi';
import { getProfile } from '../../api/staffApi';
import { LeaveRequest, LeaveBalance, leaveTypeLabel, statusLabel, statusBadgeClass } from '../../types';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
    ClipboardList,
    Wallet,
    FileText,
    Receipt,
    HandCoins,
    PencilLine,
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getMyRequests(), getMyBalance(), getProfile()])
            .then(([r, b, p]) => {
                setRequests(r.data);
                setBalance(b.data);
                setProfile(p.data);
            })
            .finally(() => setLoading(false));
    }, []);

    const pending = requests.filter(r => ['PENDING_UNIT_HEAD', 'PENDING_DIV_HEAD', 'PENDING_HR'].includes(r.status)).length;
    const active = requests.filter(r => r.status === 'ACTIVE').length;
    const recent = requests.slice(0, 5);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = (profile?.fullName || user?.fullName || 'there').split(' ')[0];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const card: React.CSSProperties = {
        background: '#fff', borderRadius: 20, padding: 20,
        border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
    };

    const statusColor: Record<string, { bg: string; color: string }> = {
        PENDING_UNIT_HEAD: { bg: '#fef3c7', color: '#d97706' },
        PENDING_DIV_HEAD: { bg: '#fef3c7', color: '#d97706' },
        PENDING_HR: { bg: '#fef3c7', color: '#d97706' },
        ACTIVE: { bg: '#dcfce7', color: '#16a34a' },
        RESUMED: { bg: '#dbeafe', color: '#2563eb' },
        REJECTED: { bg: '#fee2e2', color: '#dc2626' },
        CANCELLED: { bg: '#f1f5f9', color: '#64748b' },
    };

    const leaveTypeIcon: Record<string, string> = {
        ANNUAL: '🌴', SICK: '🤒', CASUAL: '☕', EXAM: '📚',
        MATERNITY: '👶', PATERNITY: '👨‍👧', UNPAID: '💼', OTHER: '📋',
    };

    const leaveCards = balance ? [
        { label: 'Annual', rem: balance.annualTotal - balance.annualUsed, used: balance.annualUsed, total: balance.annualTotal, color: '#16a34a', bg: '#dcfce7', icon: '🌴' },
        { label: 'Sick', rem: balance.sickTotal - balance.sickUsed, used: balance.sickUsed, total: balance.sickTotal, color: '#2563eb', bg: '#dbeafe', icon: '🤒' },
        { label: 'Casual', rem: balance.casualTotal - balance.casualUsed, used: balance.casualUsed, total: balance.casualTotal, color: '#d97706', bg: '#fef3c7', icon: '☕' },
        { label: 'Exam', rem: balance.examTotal - balance.examUsed, used: balance.examUsed, total: balance.examTotal, color: '#7c3aed', bg: '#ede9fe', icon: '📚' },
        { label: 'Maternity', rem: balance.maternityTotal - balance.maternityUsed, used: balance.maternityUsed, total: balance.maternityTotal, color: '#db2777', bg: '#fce7f3', icon: '👶' },
        { label: 'Paternity', rem: balance.paternityTotal - balance.paternityUsed, used: balance.paternityUsed, total: balance.paternityTotal, color: '#0284c7', bg: '#e0f2fe', icon: '👨‍👧' },
        { label: 'Unpaid', rem: null, used: balance.unpaidUsed, total: null, color: '#64748b', bg: '#f1f5f9', icon: '💼' },
    ] : [];

    return (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 8px 48px' }}>

            {/* GREETING HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                        {greeting}, {firstName}! 👋
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Here's what's happening with your profile today.</p>
                </div>
            </div>

            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Requests', value: requests.length, icon: '📋', color: '#7c3aed', bg: '#ede9fe' },
                    { label: 'Pending Approval', value: pending, icon: '⏳', color: '#d97706', bg: '#fef3c7' },
                    { label: 'Rejected', value: requests.filter(r => r.status === 'REJECTED').length, icon: '❌', color: '#dc2626', bg: '#fee2e2' },
                ].map((s, i) => (
                    <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* LEAVE BALANCE — full width */}
            <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Leave Balance</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Your remaining days by type</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {leaveCards.map((lc, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span>{lc.icon}</span> {lc.label}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: lc.bg, color: lc.color }}>
                      {lc.used} used
                    </span>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: lc.color, lineHeight: 1, marginBottom: 6 }}>
                                {lc.rem !== null ? lc.rem : '∞'}
                                {lc.total !== null && <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}> / {lc.total} days</span>}
                            </div>
                            {lc.total !== null && (
                                <div style={{ height: 4, borderRadius: 99, background: '#e2e8f0' }}>
                                    <div style={{ height: '100%', borderRadius: 99, background: lc.color, width: `${lc.total > 0 ? Math.min(100, (lc.used / lc.total) * 100) : 0}%`, transition: 'width 0.4s' }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ANNOUNCEMENTS + QUICK ACTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, marginBottom: 20 }}>

                {/* Announcements */}
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Announcements</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { icon: '📢', iconBg: '#ede9fe', iconColor: '#7c3aed', title: 'Public Holiday', body: 'Eid-el-Kabir holiday on June 6, 2025.', date: 'May 15, 2025' },
                            { icon: '🔔', iconBg: '#dcfce7', iconColor: '#16a34a', title: 'System Maintenance', body: 'System will be offline on May 25, 2025 from 10PM – 2AM.', date: 'May 12, 2025' },
                            { icon: 'ℹ️', iconBg: '#fef3c7', iconColor: '#d97706', title: 'New Leave Policy', body: 'Please review the updated leave policy document.', date: 'May 8, 2025' },
                        ].map((a, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                    {a.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>{a.title}</div>
                                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>{a.body}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.date}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>View all announcements →</span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={card}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Quick Actions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'Apply for Leave', desc: 'Request time off', icon: <PencilLine size={18} />, path: '/employee/apply', color: '#7c3aed', bg: '#f5f0ff' },
                            { label: 'Apply for Loan', desc: 'Request a loan', icon: <HandCoins size={18} />, path: '/employee/apply-loan', color: '#16a34a', bg: '#ecfdf3' },
                            { label: 'My Requests', desc: 'Track your requests', icon: <ClipboardList size={18} />, path: '/employee/requests', color: '#2563eb', bg: '#eff6ff' },
                            { label: 'My Loans', desc: 'View loan details', icon: <Wallet size={18} />, path: '/employee/loans', color: '#ea580c', bg: '#fff7ed' },
                            { label: 'My Reviews', desc: 'Performance reviews', icon: <FileText size={18} />, path: '/employee/reviews', color: '#e11d48', bg: '#fff1f2' },
                            { label: 'Payslips', desc: 'View payslips', icon: <Receipt size={18} />, path: '/employee/payslips', color: '#2563eb', bg: '#eff6ff' },
                        ].map((a, i) => (
                            <Link key={i} to={a.path} style={{ textDecoration: 'none' }}>
                                <div
                                    style={{ background: a.bg, borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0, boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
                                        {a.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: a.color, lineHeight: 1.3 }}>{a.label}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{a.desc}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default EmployeeDashboard;