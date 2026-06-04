import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getMyRequests, cancelLeave, applyLeave, getMyBalance, getLeavePayment, downloadLeavePaymentEop, downloadHandoverNote, getReliefStaffOptions } from '../../api/leaveApi';
import { LeaveRequest, LeaveBalance, LeavePaymentRequest, ReliefStaffOption, LeaveType, leaveTypeLabel, statusLabel } from '../../types';
import { format, differenceInCalendarDays } from 'date-fns';

const LEAVE_GROUPS = [
    { label: 'Standard', types: ['ANNUAL', 'SICK', 'CASUAL', 'EXAM'] as LeaveType[] },
    { label: 'Family',   types: ['MATERNITY', 'UNPAID'] as LeaveType[] },
    { label: 'Others',   types: ['PATERNITY', 'OTHER'] as LeaveType[] },
];

const leaveTypeIcon: Record<string, string> = {
    ANNUAL: '🌴', SICK: '🤒', CASUAL: '☕', EXAM: '📚',
    MATERNITY: '👶', PATERNITY: '👨‍👧', UNPAID: '💼', OTHER: '📋',
};

const statusColor: Record<string, { bg: string; color: string }> = {
    PENDING_UNIT_HEAD: { bg: '#fef3c7', color: '#d97706' },
    PENDING_DIV_HEAD:  { bg: '#fef3c7', color: '#d97706' },
    PENDING_HR:        { bg: '#fef3c7', color: '#d97706' },
    ACTIVE:            { bg: '#dcfce7', color: '#16a34a' },
    RESUMED:           { bg: '#dbeafe', color: '#2563eb' },
    REJECTED:          { bg: '#fee2e2', color: '#dc2626' },
    CANCELLED:         { bg: '#f1f5f9', color: '#64748b' },
};

const leaveBalanceMeta: Record<string, { label: string; rem: (b: LeaveBalance) => number; total: (b: LeaveBalance) => number; color: string }> = {
    ANNUAL:    { label: 'Annual Leave',    rem: b => b.annualTotal - b.annualUsed,       total: b => b.annualTotal,    color: '#16a34a' },
    SICK:      { label: 'Sick Leave',      rem: b => b.sickTotal - b.sickUsed,           total: b => b.sickTotal,      color: '#2563eb' },
    CASUAL:    { label: 'Casual Leave',    rem: b => b.casualTotal - b.casualUsed,       total: b => b.casualTotal,    color: '#d97706' },
    EXAM:      { label: 'Exam Leave',      rem: b => b.examTotal - b.examUsed,           total: b => b.examTotal,      color: '#7c3aed' },
    MATERNITY: { label: 'Maternity Leave', rem: b => b.maternityTotal - b.maternityUsed, total: b => b.maternityTotal, color: '#db2777' },
    PATERNITY: { label: 'Paternity Leave', rem: b => b.paternityTotal - b.paternityUsed, total: b => b.paternityTotal, color: '#0284c7' },
    UNPAID:    { label: 'Unpaid Leave',    rem: () => 0,                                  total: () => 0,               color: '#64748b' },
    OTHER:     { label: 'Other Leave',     rem: () => 0,                                  total: () => 0,               color: '#64748b' },
};

type TabFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const LeaveRequests: React.FC = () => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<LeaveRequest | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<LeavePaymentRequest | null>(null);
    const [reliefStaff, setReliefStaff] = useState<ReliefStaffOption[]>([]);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [showApply, setShowApply] = useState(false);
    const [tab, setTab] = useState<TabFilter>('ALL');
    const [submitting, setSubmitting] = useState(false);
    const [handoverFile, setHandoverFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        leaveType: 'ANNUAL' as LeaveType,
        startDate: '', endDate: '', reason: '', reliefStaffName: '',
    });

    useEffect(() => {
        Promise.all([getMyRequests(), getMyBalance(), getReliefStaffOptions()])
            .then(([r, b, relief]) => {
                setRequests(r.data);
                setBalance(b.data);
                setReliefStaff(relief.data);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!selected?.paymentRequestSent) {
            setSelectedPayment(null);
            setPaymentError('');
            return;
        }
        setPaymentLoading(true);
        setPaymentError('');
        getLeavePayment(selected.id)
            .then(r => setSelectedPayment(r.data))
            .catch((err: any) => {
                const d = err.response?.data;
                setSelectedPayment(null);
                setPaymentError(typeof d === 'string' ? d : d?.error || 'Payment request details are not available yet.');
            })
            .finally(() => setPaymentLoading(false));
    }, [selected]);

    const days = form.startDate && form.endDate
        ? differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1
        : 0;

    const handleCancel = async (id: number) => {
        try {
            await cancelLeave(id);
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
            toast.success('Leave request cancelled');
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed to cancel');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (days <= 0) { toast.error('End date must be after start date'); return; }
        if (!form.reliefStaffName) { toast.error('Please select relief staff from your department'); return; }
        if (!handoverFile) { toast.error('Please upload a handover note'); return; }
        setSubmitting(true);
        try {
            await applyLeave(form, handoverFile);
            toast.success('Leave request submitted!');
            setShowApply(false);
            setForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '', reliefStaffName: '' });
            setHandoverFile(null);
            const r = await getMyRequests();
            setRequests(r.data);
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed to submit');
        } finally { setSubmitting(false); }
    };

    const handleDownloadEop = async () => {
        if (!selected) return;
        try {
            const res = await downloadLeavePaymentEop(selected.id);
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedPayment?.eopDocumentFileName || 'eop-document';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed to download EOP');
        }
    };

    const handleDownloadHandover = async () => {
        if (!selected) return;
        try {
            const res = await downloadHandoverNote(selected.id);
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = selected.handoverNoteFileName || 'handover-note';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed to download handover note');
        }
    };

    const filtered = requests.filter(r => {
        if (tab === 'ALL') return true;
        if (tab === 'PENDING') return ['PENDING_UNIT_HEAD', 'PENDING_DIV_HEAD', 'PENDING_HR'].includes(r.status);
        if (tab === 'APPROVED') return ['ACTIVE', 'RESUMED'].includes(r.status);
        if (tab === 'REJECTED') return r.status === 'REJECTED';
        if (tab === 'CANCELLED') return r.status === 'CANCELLED';
        return true;
    });

    const balanceCards = balance ? [
        { key: 'ANNUAL', icon: '🌴', label: 'Annual Leave', rem: balance.annualTotal - balance.annualUsed, total: balance.annualTotal, color: '#16a34a', bg: '#dcfce7' },
        { key: 'SICK',   icon: '🤒', label: 'Sick Leave',   rem: balance.sickTotal - balance.sickUsed,     total: balance.sickTotal,   color: '#2563eb', bg: '#dbeafe' },
        { key: 'CASUAL', icon: '☕', label: 'Casual Leave', rem: balance.casualTotal - balance.casualUsed, total: balance.casualTotal, color: '#d97706', bg: '#fef3c7' },
        { key: 'EXAM',   icon: '📚', label: 'Exam Leave',   rem: balance.examTotal - balance.examUsed,     total: balance.examTotal,   color: '#7c3aed', bg: '#ede9fe' },
    ] : [];

    const selectedBalance = balance && leaveBalanceMeta[form.leaveType];
    const selectedRem = selectedBalance && balance ? leaveBalanceMeta[form.leaveType].rem(balance) : 0;
    const selectedTotal = selectedBalance && balance ? leaveBalanceMeta[form.leaveType].total(balance) : 0;

    const card: React.CSSProperties = {
        background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 8px 48px', display: 'flex', gap: 20 }}>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, minWidth: 0 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Leave Requests</h1>
                        <p style={{ color: '#64748b', fontSize: 14 }}>View and manage all your leave requests</p>
                    </div>
                    <button
                        onClick={() => { setShowApply(true); setSelected(null); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                        + Apply for Leave
                    </button>
                </div>

                {/* Balance cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {balanceCards.map(bc => (
                        <div key={bc.key} style={{ ...card, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: bc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                    {bc.icon}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{bc.label}</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: bc.color, lineHeight: 1, marginBottom: 2 }}>{bc.rem}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>days left · out of {bc.total} days</div>
                            <div style={{ height: 3, borderRadius: 99, background: '#e2e8f0' }}>
                                <div style={{ height: '100%', borderRadius: 99, background: bc.color, width: `${bc.total > 0 ? Math.min(100, ((bc.total - bc.rem) / bc.total) * 100) : 0}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 12, padding: 4 }}>
                        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as TabFilter[]).map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                padding: '6px 14px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: tab === t ? '#fff' : 'transparent',
                                color: tab === t ? '#0f172a' : '#64748b',
                                boxShadow: tab === t ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                                transition: 'all 0.15s',
                            }}>
                                {t === 'ALL' ? 'All Requests' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Request list */}
                {filtered.length === 0 ? (
                    <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No requests found</div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>You haven't submitted any leave requests yet</div>
                        <button onClick={() => setShowApply(true)} style={{ padding: '9px 20px', borderRadius: 10, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Apply for Leave
                        </button>
                    </div>
                ) : (
                    <div style={{ ...card, overflow: 'hidden' }}>
                        {/* Table header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 1.5fr 1fr', gap: 8, padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            {['Leave Type', 'Duration', 'Days', 'Reason', 'Status', 'Applied On', 'Action'].map(h => (
                                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                            ))}
                        </div>
                        {filtered.map((r, i) => {
                            const sc = statusColor[r.status] || { bg: '#f1f5f9', color: '#64748b' };
                            const canCancel = ['PENDING_UNIT_HEAD', 'PENDING_DIV_HEAD'].includes(r.status);
                            return (
                                <div
                                    key={r.id}
                                    onClick={() => { setSelected(r); setShowApply(false); }}
                                    style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 1.5fr 1fr', gap: 8, padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                                            {leaveTypeIcon[r.leaveType]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{leaveTypeLabel[r.leaveType]}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                {r.leaveType === 'ANNUAL' ? 'Vacation' : r.leaveType === 'SICK' ? 'Medical' : 'Personal'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div>{format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                            ({format(new Date(r.startDate), 'EEE')} – {format(new Date(r.endDate), 'EEE')})
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center' }}>{r.totalDays}</div>
                                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center' }}>
                                        {r.reason ? r.reason.slice(0, 30) + (r.reason.length > 30 ? '...' : '') : '—'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700 }}>
                      {statusLabel[r.status]}
                    </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                        {format(new Date(r.createdAt), 'MMM d, yyyy')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {canCancel ? (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleCancel(r.id); }}
                                                style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fff', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: 18, color: '#cbd5e1' }}>···</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SIDE PANEL — Apply or Detail */}
            {(showApply || selected) && (
                <>
                    {/* Backdrop on mobile */}
                    <div
                        onClick={() => { setShowApply(false); setSelected(null); }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 40, display: 'none' }}
                    />
                    <div style={{
                        width: 380, flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start',
                        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
                    }}>
                        <div style={{ ...card, padding: 24 }}>

                            {/* APPLY PANEL */}
                            {showApply && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Apply for Leave</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Fill in the details to submit your leave request</div>
                                        </div>
                                        <button onClick={() => setShowApply(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#64748b' }}>✕</button>
                                    </div>
                                    <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

                                    <form onSubmit={handleSubmit}>
                                        {/* Leave Type */}
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                                                Leave Type <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <select
                                                value={form.leaveType}
                                                onChange={e => setForm(f => ({ ...f, leaveType: e.target.value as LeaveType }))}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' }}
                                            >
                                                {LEAVE_GROUPS.map(group => (
                                                    <optgroup key={group.label} label={group.label}>
                                                        {group.types.map(t => (
                                                            <option key={t} value={t}>{leaveTypeLabel[t]}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Balance preview */}
                                        {balance && selectedTotal > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: 14 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 18 }}>{leaveTypeIcon[form.leaveType]}</span>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{leaveBalanceMeta[form.leaveType]?.label} Balance</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: leaveBalanceMeta[form.leaveType]?.color }}>{selectedRem} days left</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>out of {selectedTotal} days</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dates */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                            <div>
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input type="date" value={form.startDate} min={new Date().toISOString().split('T')[0]}
                                                       onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                                       style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} required />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>End Date <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input type="date" value={form.endDate} min={form.startDate}
                                                       onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                                       style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} required />
                                            </div>
                                        </div>

                                        {/* Days preview */}
                                        {days > 0 && (
                                            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 14, fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                                                📅 {days} day{days > 1 ? 's' : ''} requested
                                                {days >= 10 && form.leaveType === 'ANNUAL' && <span style={{ marginLeft: 10, color: '#059669' }}>💰 Allowance applicable</span>}
                                            </div>
                                        )}

                                        {/* Total days display */}
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>Total Days</label>
                                            <div style={{ padding: '9px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, color: days > 0 ? '#0f172a' : '#94a3b8' }}>
                                                {days > 0 ? `${days} days` : '0 days'}
                                            </div>
                                        </div>

                                        {/* Relief Staff */}
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>Relief Staff Name <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select value={form.reliefStaffName}
                                                    onChange={e => setForm(f => ({ ...f, reliefStaffName: e.target.value }))}
                                                    disabled={reliefStaff.length === 0}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: form.reliefStaffName ? '#0f172a' : '#94a3b8', outline: 'none', boxSizing: 'border-box', background: reliefStaff.length === 0 ? '#f8fafc' : '#fff' }} required>
                                                <option value="">{reliefStaff.length === 0 ? 'No department colleagues available' : 'Select colleague covering your duties'}</option>
                                                {reliefStaff.map(staff => (
                                                    <option key={staff.id} value={staff.fullName}>
                                                        {staff.fullName}{staff.position ? ` - ${staff.position}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {reliefStaff.length === 0 && (
                                                <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Ask HR to assign active staff to your department before applying.</div>
                                            )}
                                        </div>

                                        {/* Reason */}
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>Reason <span style={{ color: '#ef4444' }}>*</span></label>
                                            <textarea value={form.reason} rows={3} placeholder="Enter reason for leave" maxLength={250}
                                                      onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} required />
                                            <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{form.reason.length}/250</div>
                                        </div>

                                        {/* Handover Note */}
                                        <div style={{ marginBottom: 20 }}>
                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                                                Attachment <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(handover note)</span>
                                            </label>
                                            <div style={{ border: `2px dashed ${handoverFile ? '#16a34a' : '#e2e8f0'}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center', background: handoverFile ? '#f0fdf4' : '#f8fafc', cursor: 'pointer' }}>
                                                <input type="file" id="handoverNote" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }}
                                                       onChange={e => setHandoverFile(e.target.files?.[0] || null)} />
                                                <label htmlFor="handoverNote" style={{ cursor: 'pointer' }}>
                                                    {handoverFile ? (
                                                        <>
                                                            <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{handoverFile.name}</div>
                                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Click to change</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div style={{ fontSize: 28, marginBottom: 6 }}>☁️</div>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Drag & drop file here or <span style={{ color: '#7c3aed' }}>Browse</span></div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, JPG, PNG up to 10MB</div>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button type="button" onClick={() => setShowApply(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                                Cancel
                                            </button>
                                            <button type="submit" disabled={submitting || reliefStaff.length === 0} style={{ flex: 2, padding: '11px', borderRadius: 12, background: submitting || reliefStaff.length === 0 ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: submitting || reliefStaff.length === 0 ? 'not-allowed' : 'pointer' }}>
                                                {submitting ? 'Submitting...' : 'Submit Request'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}

                            {/* DETAIL PANEL */}
                            {selected && !showApply && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                                {leaveTypeIcon[selected.leaveType]}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{leaveTypeLabel[selected.leaveType]}</div>
                                                <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, ...(statusColor[selected.status] || { background: '#f1f5f9', color: '#64748b' }) }}>
                          {statusLabel[selected.status]}
                        </span>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                    </div>

                                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                            {[
                                                { label: 'Period', value: `${format(new Date(selected.startDate), 'dd MMM')} – ${format(new Date(selected.endDate), 'dd MMM yyyy')}` },
                                                { label: 'Days', value: `${selected.totalDays} day${selected.totalDays !== 1 ? 's' : ''}` },
                                                { label: 'Relief', value: selected.reliefStaffName },
                                            ].map((item, i) => (
                                                <div key={i}>
                                                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {selected.reason && <div style={{ marginTop: 10, fontSize: 13, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>{selected.reason}</div>}
                                        {selected.handoverNoteFileName && (
                                            <button onClick={handleDownloadHandover} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#7c3aed', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                Download Handover: {selected.handoverNoteFileName}
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Approval Progress</div>
                                    {[
                                        { label: 'Unit Head', status: selected.unitHeadStatus, reviewer: selected.unitHeadReviewer?.fullName, comment: selected.unitHeadComment, at: selected.unitHeadReviewedAt },
                                        { label: 'Divisional Head', status: selected.divHeadStatus, reviewer: selected.divHeadReviewer?.fullName, comment: selected.divHeadComment, at: selected.divHeadReviewedAt },
                                        { label: 'HR Processing', status: selected.hrStatus, reviewer: selected.hrProcessor?.fullName, comment: selected.hrComment, at: selected.hrProcessedAt },
                                    ].map((step, i) => {
                                        const dotColor: Record<string, string> = { PENDING: '#d97706', APPROVED: '#16a34a', REJECTED: '#dc2626', SKIPPED: '#94a3b8' };
                                        const dotIcon: Record<string, string> = { PENDING: '⏳', APPROVED: '✅', REJECTED: '❌', SKIPPED: '⏭' };
                                        return (
                                            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: dotColor[step.status] || '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                                                    {dotIcon[step.status]}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{step.label}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                                        {step.status === 'SKIPPED' ? 'Not applicable' :
                                                            step.status === 'PENDING' ? 'Awaiting review' :
                                                                `${step.status} by ${step.reviewer || 'N/A'}${step.at ? ' · ' + format(new Date(step.at), 'dd MMM yyyy') : ''}`}
                                                    </div>
                                                    {step.comment && <div style={{ fontSize: 12, color: '#374151', marginTop: 2, fontStyle: 'italic' }}>"{step.comment}"</div>}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {selected.paymentApplicable && (
                                        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#15803d' }}>
                                            💰 Annual leave allowance applicable — payment raised to Accounts
                                        </div>
                                    )}

                                    {selected.paymentRequestSent && (
                                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8' }}>
                                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment Details</div>
                                            {paymentLoading ? (
                                                <div>Loading payment...</div>
                                            ) : selectedPayment ? (
                                                <>
                                                    <div>Amount: <strong>₦{Number(selectedPayment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
                                                    <div>Status: <strong>{selectedPayment.status}</strong></div>
                                                    {selectedPayment.processedAt && <div>Processed: {format(new Date(selectedPayment.processedAt), 'dd MMM yyyy')}</div>}
                                                    {selectedPayment.eopDocumentFileName ? (
                                                        <button onClick={handleDownloadEop} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                            Download EOP: {selectedPayment.eopDocumentFileName}
                                                        </button>
                                                    ) : (
                                                        <div style={{ marginTop: 4 }}>EOP document has not been uploaded yet.</div>
                                                    )}
                                                </>
                                            ) : (
                                                <div>{paymentError || 'Payment request details are not available yet.'}</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LeaveRequests;
