import React, {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {applyLoan, getEligibleGuarantors, getMyLoans} from '../../api/loanApi';
import {useAuth} from '../../context/AuthContext';
import {LoanRequest, loanStatusMeta, REPAYMENT_DURATIONS} from '../../types/loan';
import {format} from 'date-fns';
import GuarantorRequests from "../guarantor/GuarantorRequests";

const MyLoans: React.FC = () => {
    const {user} = useAuth();
    const [tab, setTab] = useState<'loans' | 'guarantor'>('loans');
    const [loans, setLoans] = useState<LoanRequest[]>([]);
    const [eligibleGuarantors, setEligibleGuarantors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<LoanRequest | null>(null);
    const [showApply, setShowApply] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasActiveLoan, setHasActiveLoan] = useState(false);
    const [form, setForm] = useState({
        amount: '',
        monthlySalary: '',
        repaymentMonths: '12',
        reason: '',
        purpose: 'PERSONAL',
        guarantor1Id: '',
        guarantor2Id: '',
    });

    useEffect(() => {
        Promise.all([getMyLoans(), getEligibleGuarantors()])
            .then(([l, g]) => {
                const loansArr: LoanRequest[] = Array.isArray(l.data) ? l.data : [];

                console.log('API loans response:', l.data);
                console.log('Processed loans:', loansArr);

                setLoans(loansArr);

                setEligibleGuarantors(Array.isArray(g.data) ? g.data : []);

                const active = loansArr.some((ln: LoanRequest) => !['FULLY_REPAID', 'REJECTED', 'CANCELLED']
                    .includes(ln.status));

                setHasActiveLoan(active);
            })
            .finally(() => setLoading(false));
    }, []);

    const amount = parseFloat(form.amount) || 0;
    const salary = parseFloat(form.monthlySalary) || 0;
    const months = parseInt(form.repaymentMonths) || 12;
    const monthly = amount > 0 && months > 0 ? amount / months : 0;
    const maxMonthly = salary * 0.33;
    const isOverLimit = monthly > maxMonthly && salary > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOverLimit) {
            toast.error('Monthly deduction exceeds 33% of salary');
            return;
        }
        if (form.guarantor1Id === form.guarantor2Id) {
            toast.error('Guarantors must be different');
            return;
        }
        setSubmitting(true);
        try {
            await applyLoan({
                amount,
                monthlySalary: salary,
                repaymentMonths: months,
                reason: form.reason,
                purpose: form.purpose,
                guarantor1Id: parseInt(form.guarantor1Id),
                guarantor2Id: parseInt(form.guarantor2Id),
            });
            toast.success('Loan application submitted! Guarantors notified.');
            setShowApply(false);
            setForm({
                amount: '',
                monthlySalary: '',
                repaymentMonths: '12',
                reason: '',
                purpose: 'PERSONAL',
                guarantor1Id: '',
                guarantor2Id: ''
            });
            const l = await getMyLoans();
            const loansData: LoanRequest[] = Array.isArray(l.data) ? l.data : [];
            setLoans(loansData);
            setHasActiveLoan(loansData.some((ln: LoanRequest) => !['FULLY_REPAID', 'REJECTED', 'CANCELLED'].includes(ln.status)));
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const guarantors: any[] = Array.isArray(eligibleGuarantors) ? eligibleGuarantors : [];
    const g2Options = guarantors.filter(e => e.id !== parseInt(form.guarantor1Id || '0'));
    const gradesConfigured = guarantors.some(e => e.grade != null);

    const card: React.CSSProperties = {
        background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
    };

    const statusColorMap: Record<string, { bg: string; color: string }> = {
        PENDING_GUARANTORS: {bg: '#fef3c7', color: '#d97706'},
        PENDING_UNIT_HEAD: {bg: '#fef3c7', color: '#d97706'},
        PENDING_DIV_HEAD: {bg: '#fef3c7', color: '#d97706'},
        PENDING_MD: {bg: '#ede9fe', color: '#7c3aed'},
        PENDING_HR: {bg: '#fef3c7', color: '#d97706'},
        PENDING_ACCOUNTS: {bg: '#dbeafe', color: '#2563eb'},
        DISBURSED: {bg: '#dcfce7', color: '#16a34a'},
        FULLY_REPAID: {bg: '#dcfce7', color: '#15803d'},
        OVERDUE: {bg: '#fee2e2', color: '#dc2626'},
        REJECTED: {bg: '#fee2e2', color: '#dc2626'},
        CANCELLED: {bg: '#f1f5f9', color: '#64748b'},
    };

    if (loading) return (<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh'}}>
            <div style={{
                width: 32,
                height: 32,
                border: '3px solid #e2e8f0',
                borderTopColor: '#7c3aed',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite'
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>);

    return (<div style={{maxWidth: 1280, margin: '0 auto', padding: '12px 8px 48px', display: 'flex', gap: 20}}>

            {/* MAIN */}
            <div style={{flex: 1, minWidth: 0}}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 12
                }}>
                    <div>
                        <h1 style={{fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 2}}>My Loans</h1>
                        <p style={{color: '#64748b', fontSize: 14}}>Track your loan applications and repayments</p>
                    </div>
                    {!hasActiveLoan && (<button
                            onClick={() => {
                                setShowApply(true);
                                setSelected(null);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                borderRadius: 12,
                                background: '#7c3aed',
                                color: '#fff',
                                border: 'none',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Apply for Loan
                        </button>)}
                </div>

                <div style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 20
                }}>
                    <button
                        onClick={() => setTab('loans')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background: tab === 'loans' ? '#7c3aed' : '#f1f5f9',
                            color: tab === 'loans' ? '#fff' : '#475569'
                        }}
                    >
                        💰 My Loans
                    </button>

                    <button
                        onClick={() => setTab('guarantor')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background: tab === 'guarantor' ? '#7c3aed' : '#f1f5f9',
                            color: tab === 'guarantor' ? '#fff' : '#475569'
                        }}
                    >
                        ✍️ Guarantor Requests
                    </button>
                </div>

                {tab === 'loans' && (
                    <>
                    {loans.length === 0 ? (<div style={{...card, padding: '48px 24px', textAlign: 'center'}}>
                        <div style={{fontSize: 40, marginBottom: 12}}>💰</div>
                        <div style={{fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4}}>No loan
                            applications yet
                        </div>
                        <div style={{fontSize: 13, color: '#94a3b8', marginBottom: 20}}>Apply for a loan and track it
                            here
                        </div>
                        <button onClick={() => setShowApply(true)} style={{
                            padding: '9px 20px',
                            borderRadius: 10,
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                            Apply for a Loan
                        </button>
                        </div>) : (<div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                        {loans.map(loan => {
                            const s = loanStatusMeta[loan.status] || {
                                label: loan.status, bg: '#f1f5f9', color: '#64748b'
                            };
                            const sc = statusColorMap[loan.status] || {bg: '#f1f5f9', color: '#64748b'};
                            const paidCount = loan.repayments?.filter(r => r.status === 'PAID').length || 0;
                            const progress = loan.repaymentMonths > 0 ? (paidCount / loan.repaymentMonths) * 100 : 0;
                            return (<div
                                    key={loan.id}
                                    onClick={() => {
                                        setSelected(loan);
                                        setShowApply(false);
                                    }}
                                    style={{
                                        ...card,
                                        padding: 20,
                                        cursor: 'pointer',
                                        borderLeft: loan.status === 'OVERDUE' ? '4px solid #ef4444' : '4px solid transparent',
                                        transition: 'box-shadow 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.04)'}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        flexWrap: 'wrap',
                                        gap: 12
                                    }}>
                                        <div style={{flex: 1}}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                marginBottom: 8,
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{fontSize: 22, fontWeight: 800, color: '#0f172a'}}>
                                                    ₦{Number(loan.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}
                                                </div>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 999,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    background: sc.bg,
                                                    color: sc.color
                                                }}>
                          {s.label}
                        </span>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                gap: 16,
                                                flexWrap: 'wrap',
                                                fontSize: 13,
                                                color: '#64748b'
                                            }}>
                                                <span>📅 {format(new Date(loan.createdAt), 'dd MMM yyyy')}</span>
                                                <span>🗓 {loan.repaymentMonths} months</span>
                                                <span>💳 ₦{Number(loan.monthlyDeduction).toLocaleString('en-NG')}/month</span>
                                                {loan.purpose && <span>🎯 {loan.purpose}</span>}
                                            </div>

                                            {loan.guarantors?.length > 0 && (
                                                <div style={{marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                                                    {loan.guarantors.map(g => (<span key={g.id} style={{
                                                            fontSize: 12,
                                                            padding: '3px 10px',
                                                            borderRadius: 20,
                                                            fontWeight: 600,
                                                            background: g.status === 'SIGNED' ? '#dcfce7' : g.status === 'DECLINED' ? '#fee2e2' : '#fef3c7',
                                                            color: g.status === 'SIGNED' ? '#16a34a' : g.status === 'DECLINED' ? '#dc2626' : '#d97706'
                                                        }}>
                              G{g.slotNumber}: {g.guarantor.fullName} — {g.status}
                            </span>))}
                                                </div>)}

                                            {(loan.status === 'DISBURSED' || loan.status === 'OVERDUE' || loan.status === 'FULLY_REPAID') && (
                                                <div style={{marginTop: 12}}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: 12,
                                                        color: '#64748b',
                                                        marginBottom: 4
                                                    }}>
                                                        <span>Repayment ({paidCount}/{loan.repaymentMonths} installments)</span>
                                                        <span
                                                            style={{color: loan.hasOverdueInstallment ? '#ef4444' : undefined}}>
                              Outstanding: ₦{Number(loan.outstandingBalance).toLocaleString('en-NG')}
                            </span>
                                                    </div>
                                                    <div style={{height: 6, borderRadius: 99, background: '#e2e8f0'}}>
                                                        <div style={{
                                                            height: '100%',
                                                            borderRadius: 99,
                                                            background: loan.status === 'OVERDUE' ? '#ef4444' : progress === 100 ? '#22c55e' : '#7c3aed',
                                                            width: `${progress}%`,
                                                            transition: 'width 0.4s'
                                                        }}/>
                                                    </div>
                                                </div>)}
                                        </div>
                                    </div>
                                </div>);
                        })}
                    </div>)}
                    </>
                )}
                {tab === 'guarantor' && (
                    <GuarantorRequests />
                )}
            </div>

            {/* SIDE PANEL */}
            {(showApply || selected) && (<div style={{
                    width: 400,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 20,
                    alignSelf: 'flex-start',
                    maxHeight: 'calc(100vh - 40px)',
                    overflowY: 'auto'
                }}>
                    <div style={{...card, padding: 24}}>

                        {/* APPLY PANEL */}
                        {showApply && (<>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 6
                                }}>
                                    <div>
                                        <div style={{fontSize: 18, fontWeight: 700, color: '#0f172a'}}>Apply for Loan
                                        </div>
                                        <div style={{fontSize: 12, color: '#94a3b8', marginTop: 2}}>Fill in the details
                                            to submit your application
                                        </div>
                                    </div>
                                    <button onClick={() => setShowApply(false)} style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        border: '1px solid #e2e8f0',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>✕
                                    </button>
                                </div>
                                <div style={{height: 1, background: '#f1f5f9', margin: '14px 0'}}/>

                                {hasActiveLoan ? (<div style={{textAlign: 'center', padding: '24px 0'}}>
                                        <div style={{fontSize: 36, marginBottom: 12}}>🔒</div>
                                        <div style={{fontWeight: 700, fontSize: 15, marginBottom: 8}}>Active loan
                                            exists
                                        </div>
                                        <div style={{fontSize: 13, color: '#64748b'}}>Complete your current loan
                                            repayment before applying for a new one.
                                        </div>
                                    </div>) : (<form onSubmit={handleSubmit}>
                                        {/* Approval flow */}
                                        <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16}}>
                                            {['Submit', 'Guarantors', 'Unit Head', 'Div Head', 'MD', 'HR', 'Accounts'].map((s, i) => (
                                                <span key={i} style={{
                                                    padding: '3px 8px',
                                                    borderRadius: 20,
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    background: i === 0 ? '#7c3aed' : '#f1f5f9',
                                                    color: i === 0 ? '#fff' : '#64748b'
                                                }}>
                          {i + 1}. {s}
                        </span>))}
                                        </div>

                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12
                                        }}>
                                            <div>
                                                <label style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#0f172a',
                                                    display: 'block',
                                                    marginBottom: 5
                                                }}>Loan Amount (₦) *</label>
                                                <input type="number" value={form.amount} min="1000"
                                                       placeholder="500,000"
                                                       onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                                                       style={{
                                                           width: '100%',
                                                           padding: '9px 12px',
                                                           borderRadius: 10,
                                                           border: '1px solid #e2e8f0',
                                                           fontSize: 13,
                                                           outline: 'none',
                                                           boxSizing: 'border-box'
                                                       }} required/>
                                            </div>
                                            <div>
                                                <label style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#0f172a',
                                                    display: 'block',
                                                    marginBottom: 5
                                                }}>Monthly Salary (₦) *</label>
                                                <input type="number" value={form.monthlySalary} min="1"
                                                       placeholder="300,000"
                                                       onChange={e => setForm(f => ({
                                                           ...f, monthlySalary: e.target.value
                                                       }))}
                                                       style={{
                                                           width: '100%',
                                                           padding: '9px 12px',
                                                           borderRadius: 10,
                                                           border: '1px solid #e2e8f0',
                                                           fontSize: 13,
                                                           outline: 'none',
                                                           boxSizing: 'border-box'
                                                       }} required/>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12
                                        }}>
                                            <div>
                                                <label style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#0f172a',
                                                    display: 'block',
                                                    marginBottom: 5
                                                }}>Repayment Period</label>
                                                <select value={form.repaymentMonths} onChange={e => setForm(f => ({
                                                    ...f, repaymentMonths: e.target.value
                                                }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '9px 12px',
                                                            borderRadius: 10,
                                                            border: '1px solid #e2e8f0',
                                                            fontSize: 13,
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}>
                                                    {REPAYMENT_DURATIONS.map(m => <option key={m}
                                                                                          value={m}>{m} months</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#0f172a',
                                                    display: 'block',
                                                    marginBottom: 5
                                                }}>Purpose</label>
                                                <select value={form.purpose}
                                                        onChange={e => setForm(f => ({...f, purpose: e.target.value}))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '9px 12px',
                                                            borderRadius: 10,
                                                            border: '1px solid #e2e8f0',
                                                            fontSize: 13,
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}>
                                                    {['PERSONAL', 'MEDICAL', 'EDUCATION', 'HOUSING', 'BUSINESS', 'OTHER'].map(p => (
                                                        <option key={p}
                                                                value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Loan summary */}
                                        {amount > 0 && salary > 0 && (<div style={{
                                                padding: 12,
                                                borderRadius: 10,
                                                background: isOverLimit ? '#fef2f2' : '#f0fdf4',
                                                border: `1px solid ${isOverLimit ? '#fca5a5' : '#86efac'}`,
                                                marginBottom: 12
                                            }}>
                                                <div style={{display: 'flex', justifyContent: 'space-around', gap: 8}}>
                                                    <div style={{textAlign: 'center'}}>
                                                        <div style={{
                                                            fontSize: 16, fontWeight: 800
                                                        }}>₦{monthly.toLocaleString('en-NG', {maximumFractionDigits: 0})}</div>
                                                        <div style={{
                                                            fontSize: 10, color: '#64748b', fontWeight: 600
                                                        }}>MONTHLY
                                                        </div>
                                                    </div>
                                                    <div style={{textAlign: 'center'}}>
                                                        <div style={{
                                                            fontSize: 16, fontWeight: 800, color: '#22c55e'
                                                        }}>₦{maxMonthly.toLocaleString('en-NG', {maximumFractionDigits: 0})}</div>
                                                        <div style={{
                                                            fontSize: 10, color: '#64748b', fontWeight: 600
                                                        }}>MAX (33%)
                                                        </div>
                                                    </div>
                                                    <div style={{textAlign: 'center'}}>
                                                        <div style={{
                                                            fontSize: 16, fontWeight: 800, color: '#7c3aed'
                                                        }}>{months}mo
                                                        </div>
                                                        <div style={{
                                                            fontSize: 10, color: '#64748b', fontWeight: 600
                                                        }}>DURATION
                                                        </div>
                                                    </div>
                                                </div>
                                                {isOverLimit &&
                                                    <div style={{marginTop: 8, color: '#dc2626', fontSize: 12}}>⚠️
                                                        Exceeds 33% of salary. Increase months or reduce amount.</div>}
                                            </div>)}

                                        <div style={{marginBottom: 12}}>
                                            <label style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#0f172a',
                                                display: 'block',
                                                marginBottom: 5
                                            }}>Reason *</label>
                                            <textarea value={form.reason} rows={2}
                                                      placeholder="Why do you need this loan?"
                                                      onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                                                      style={{
                                                          width: '100%',
                                                          padding: '9px 12px',
                                                          borderRadius: 10,
                                                          border: '1px solid #e2e8f0',
                                                          fontSize: 13,
                                                          outline: 'none',
                                                          resize: 'vertical',
                                                          boxSizing: 'border-box'
                                                      }} required/>
                                        </div>

                                        {/* Guarantors */}
                                        <div style={{
                                            padding: 12,
                                            borderRadius: 10,
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            marginBottom: 16
                                        }}>
                                            <div style={{
                                                fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6
                                            }}>👥 Select 2 Guarantors
                                            </div>
                                            <div style={{fontSize: 12, color: '#64748b', marginBottom: 10}}>
                                                {gradesConfigured ? 'Only employees with a higher grade than yours are shown.' : 'Select any 2 active employees.'}
                                            </div>
                                            {guarantors.length === 0 ? (
                                                <div style={{fontSize: 12, color: '#ef4444'}}>⚠️ No eligible guarantors.
                                                    Contact HR.</div>) : (<>
                                                    <div style={{marginBottom: 8}}>
                                                        <label style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#0f172a',
                                                            display: 'block',
                                                            marginBottom: 4
                                                        }}>Guarantor 1 *</label>
                                                        <select value={form.guarantor1Id} onChange={e => setForm(f => ({
                                                            ...f, guarantor1Id: e.target.value
                                                        }))} required
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px 10px',
                                                                    borderRadius: 8,
                                                                    border: '1px solid #e2e8f0',
                                                                    fontSize: 12,
                                                                    outline: 'none',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                            <option value="">Select employee...</option>
                                                            {guarantors.map(e => <option key={e.id}
                                                                                         value={e.id}>{e.fullName}{e.grade ? ` — ${e.grade.name}` : ''}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#0f172a',
                                                            display: 'block',
                                                            marginBottom: 4
                                                        }}>Guarantor 2 *</label>
                                                        <select value={form.guarantor2Id} onChange={e => setForm(f => ({
                                                            ...f, guarantor2Id: e.target.value
                                                        }))} required
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px 10px',
                                                                    borderRadius: 8,
                                                                    border: '1px solid #e2e8f0',
                                                                    fontSize: 12,
                                                                    outline: 'none',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                            <option value="">Select employee...</option>
                                                            {(g2Options ?? []).map(e => <option key={e.id}
                                                                                                value={e.id}>{e.fullName}{e.grade ? ` — ${e.grade.name}` : ''}</option>)}
                                                        </select>
                                                    </div>
                                                </>)}
                                        </div>

                                        <div style={{display: 'flex', gap: 10}}>
                                            <button type="button" onClick={() => setShowApply(false)} style={{
                                                flex: 1,
                                                padding: '11px',
                                                borderRadius: 12,
                                                border: '1.5px solid #e2e8f0',
                                                background: '#fff',
                                                color: '#475569',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}>
                                                Cancel
                                            </button>
                                            <button type="submit"
                                                    disabled={submitting || isOverLimit || guarantors.length === 0}
                                                    style={{
                                                        flex: 2,
                                                        padding: '11px',
                                                        borderRadius: 12,
                                                        background: submitting ? '#a78bfa' : '#7c3aed',
                                                        color: '#fff',
                                                        border: 'none',
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                                    }}>
                                                {submitting ? 'Submitting...' : '💰 Submit Application'}
                                            </button>
                                        </div>
                                    </form>)}
                            </>)}

                        {/* DETAIL PANEL */}
                        {selected && !showApply && (<>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16
                                }}>
                                    <div>
                                        <div style={{fontSize: 20, fontWeight: 800, color: '#0f172a'}}>
                                            ₦{Number(selected.amount).toLocaleString('en-NG', {minimumFractionDigits: 2})}
                                        </div>
                                        <span style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            padding: '3px 10px',
                                            borderRadius: 999,
                                            background: (statusColorMap[selected.status] || {bg: '#f1f5f9'}).bg,
                                            color: (statusColorMap[selected.status] || {color: '#64748b'}).color
                                        }}>
                      {loanStatusMeta[selected.status]?.label || selected.status}
                    </span>
                                    </div>
                                    <button onClick={() => setSelected(null)} style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        border: '1px solid #e2e8f0',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>✕
                                    </button>
                                </div>

                                <div style={{background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16}}>
                                    {[{
                                        label: 'Applied',
                                        value: format(new Date(selected.createdAt), 'dd MMM yyyy')
                                    }, {label: 'Duration', value: `${selected.repaymentMonths} months`}, {
                                        label: 'Monthly',
                                        value: `₦${Number(selected.monthlyDeduction).toLocaleString('en-NG')}`
                                    }, {label: 'Purpose', value: selected.purpose || '—'},].map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 0',
                                            borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none'
                                        }}>
                                            <div style={{fontSize: 12, color: '#94a3b8'}}>{item.label}</div>
                                            <div style={{
                                                fontSize: 13, fontWeight: 600, color: '#0f172a'
                                            }}>{item.value}</div>
                                        </div>))}
                                </div>

                                {selected.reason && (<div style={{
                                        fontSize: 13,
                                        color: '#475569',
                                        marginBottom: 16,
                                        padding: '10px 14px',
                                        background: '#f8fafc',
                                        borderRadius: 10
                                    }}>
                                        {selected.reason}
                                    </div>)}

                                {selected.guarantors?.length > 0 && (<div style={{marginBottom: 16}}>
                                        <div style={{
                                            fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10
                                        }}>Guarantors
                                        </div>
                                        {selected.guarantors.map(g => (<div key={g.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 0',
                                                borderBottom: '1px solid #f8fafc'
                                            }}>
                                                <div style={{
                                                    fontSize: 13, color: '#0f172a'
                                                }}>G{g.slotNumber}: {g.guarantor.fullName}</div>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 999,
                                                    background: g.status === 'SIGNED' ? '#dcfce7' : g.status === 'DECLINED' ? '#fee2e2' : '#fef3c7',
                                                    color: g.status === 'SIGNED' ? '#16a34a' : g.status === 'DECLINED' ? '#dc2626' : '#d97706'
                                                }}>
                          {g.status}
                        </span>
                                            </div>))}
                                    </div>)}

                                {(selected.status === 'DISBURSED' || selected.status === 'OVERDUE' || selected.status === 'FULLY_REPAID') && (
                                    <div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 12,
                                            color: '#64748b',
                                            marginBottom: 6
                                        }}>
                                            <span>Repayment progress</span>
                                            <span>Outstanding: ₦{Number(selected.outstandingBalance).toLocaleString('en-NG')}</span>
                                        </div>
                                        <div style={{
                                            height: 8, borderRadius: 99, background: '#e2e8f0', marginBottom: 12
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                borderRadius: 99,
                                                background: selected.status === 'OVERDUE' ? '#ef4444' : '#7c3aed',
                                                width: `${selected.repaymentMonths > 0 ? ((selected.repayments?.filter(r => r.status === 'PAID').length || 0) / selected.repaymentMonths) * 100 : 0}%`
                                            }}/>
                                        </div>
                                    </div>)}
                            </>)}
                    </div>
                </div>)}
        </div>);
};

export default MyLoans;