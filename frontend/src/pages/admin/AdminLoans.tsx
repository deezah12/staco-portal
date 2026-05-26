import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllLoans, hrProcessLoan, disburseLoan, recordRepayment, getRepaymentSchedule } from '../../api/loanApi';
import { LoanRequest, LoanRepayment, LoanStatus } from '../../types/loan';
import { format } from 'date-fns';

const statusMeta: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  PENDING_GUARANTORS: { label: 'Awaiting Guarantors', color: '#d97706', bg: '#fef3c7' },
  PENDING_UNIT_HEAD:  { label: 'Awaiting Unit Head',  color: '#7c3aed', bg: '#ede9fe' },
  PENDING_DIV_HEAD:   { label: 'Awaiting Div Head',   color: '#7c3aed', bg: '#ede9fe' },
  PENDING_MD:         { label: 'Awaiting MD',         color: '#1d4ed8', bg: '#dbeafe' },
  APPROVED:           { label: 'Approved',             color: '#16a34a', bg: '#dcfce7' },
  PROCESSING:         { label: 'Processing',           color: '#0891b2', bg: '#e0f2fe' },
  DISBURSED:          { label: 'Disbursed',            color: '#059669', bg: '#d1fae5' },
  OVERDUE:            { label: 'Overdue',              color: '#dc2626', bg: '#fee2e2' },
  REJECTED:           { label: 'Rejected',             color: '#dc2626', bg: '#fee2e2' },
  CANCELLED:          { label: 'Cancelled',            color: '#64748b', bg: '#f1f5f9' },
  FULLY_REPAID:       { label: 'Fully Repaid',         color: '#0891b2', bg: '#e0f2fe' },
};

const AdminLoans: React.FC = () => {
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<LoanRequest | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{ loan: LoanRequest; schedule: LoanRepayment[] } | null>(null);
  const [reviewForm, setReviewForm] = useState({ approved: true, comment: '', disbursementDate: '', repaymentStartDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAllLoans().then(r => setLoans(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? loans : loans.filter(l => l.status === filter);

  const handleReview = async () => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      const res = await hrProcessLoan(reviewing.id, reviewForm.comment, reviewForm.disbursementDate || undefined, reviewForm.repaymentStartDate || undefined);
      setLoans(prev => prev.map(l => l.id === reviewing.id ? res.data : l));
      toast.success(`Loan ${reviewForm.approved ? 'approved' : 'rejected'}`);
      setReviewing(null);
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburse = async (loan: LoanRequest) => {
    if (!window.confirm(`Disburse ₦${Number(loan.amount).toLocaleString('en-NG')} to ${loan.employee.fullName}?`)) return;
    try {
      const res = await disburseLoan(loan.id, 'Disbursed via admin portal');
      setLoans(prev => prev.map(l => l.id === loan.id ? res.data : l));
      toast.success('Loan disbursed!');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Disbursement failed');
    }
  };

  const handleViewSchedule = async (loan: LoanRequest) => {
    try {
      const res = await getRepaymentSchedule(loan.id);
      setScheduleModal({ loan, schedule: res.data });
    } catch { toast.error('Could not load schedule'); }
  };

  const handleMarkPaid = async (loanId: number, repaymentId: number) => {
    try {
      await recordRepayment(loanId, repaymentId);
      // Refresh schedule
      const res = await getRepaymentSchedule(loanId);
      const loanRes = await getAllLoans();
      setLoans(loanRes.data);
      if (scheduleModal) setScheduleModal(prev => prev ? { ...prev, schedule: res.data } : null);
      toast.success('Repayment recorded!');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to record repayment');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Loan Management</h1>
        <p>Review, approve, disburse and track all employee loans</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Loans', value: loans.length, icon: '💰' },
          { label: 'Pending Review', value: loans.filter(l => ['PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_MD'].includes(l.status)).length, icon: '🔐' },
          { label: 'Active / Disbursed', value: loans.filter(l => l.status === 'DISBURSED').length, icon: '💸' },
          { label: 'Fully Repaid', value: loans.filter(l => l.status === 'FULLY_REPAID').length, icon: '🎉' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['ALL', 'PENDING_GUARANTORS', 'PENDING_UNIT_HEAD', 'PENDING_DIV_HEAD', 'PENDING_MD', 'APPROVED', 'PROCESSING', 'DISBURSED', 'OVERDUE', 'REJECTED', 'FULLY_REPAID'] as const).map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
              {s === 'ALL' ? 'All' : statusMeta[s as LoanStatus]?.label || s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">💰</div><p>No loans found</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(loan => {
              const s = statusMeta[loan.status];
              return (
                <div key={loan.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{loan.employee.fullName}</span>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{loan.employee.department}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>₦{Number(loan.amount).toLocaleString('en-NG')}</span>
                        <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                        <span>🗓 {loan.repaymentMonths} months @ ₦{Number(loan.monthlyDeduction).toLocaleString('en-NG')}/mo</span>
                        <span>📅 Applied: {format(new Date(loan.createdAt), 'dd MMM yyyy')}</span>
                        {loan.disbursementDate && <span>💸 Disbursed: {format(new Date(loan.disbursementDate), 'dd MMM yyyy')}</span>}
                        {loan.status === 'DISBURSED' && <span style={{ color: '#ef4444' }}>Outstanding: ₦{Number(loan.outstandingBalance).toLocaleString('en-NG')}</span>}
                      </div>
                      {/* Guarantors */}
                      {loan.guarantors?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {loan.guarantors.map(g => (
                            <span key={g.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: g.status === 'SIGNED' ? '#dcfce7' : g.status === 'DECLINED' ? '#fee2e2' : '#fef3c7', color: g.status === 'SIGNED' ? '#16a34a' : g.status === 'DECLINED' ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                              G{g.slotNumber}: {g.guarantor.fullName} — {g.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_MD'].includes(loan.status) && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setReviewing(loan); setReviewForm({ approved: true, comment: '', disbursementDate: '', repaymentStartDate: '' }); }}>
                          Review
                        </button>
                      )}
                      {loan.status === 'APPROVED' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleDisburse(loan)}>💸 Disburse</button>
                      )}
                      {(loan.status === 'DISBURSED' || loan.status === 'FULLY_REPAID') && (
                        <button className="btn btn-outline btn-sm" onClick={() => handleViewSchedule(loan)}>📋 Schedule</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>Final Loan Review</h2>
              <button className="modal-close" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{reviewing.employee.fullName}</div>
              <div style={{ color: '#64748b' }}>Amount: <strong>₦{Number(reviewing.amount).toLocaleString('en-NG')}</strong> · {reviewing.repaymentMonths} months · ₦{Number(reviewing.monthlyDeduction).toLocaleString('en-NG')}/mo</div>
              <div style={{ color: '#64748b', marginTop: 4 }}>Reason: {reviewing.reason}</div>
              {reviewing.unitHeadComment && <div style={{ marginTop: 4, color: '#7c3aed' }}>Unit Head note: {reviewing.unitHeadComment}</div>}
              {reviewing.divHeadComment && <div style={{ marginTop: 4, color: '#7c3aed' }}>Div Head note: {reviewing.divHeadComment}</div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button className={`btn ${reviewForm.approved ? 'btn-success' : 'btn-outline'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setReviewForm(f => ({ ...f, approved: true }))}>✅ Approve</button>
              <button className={`btn ${!reviewForm.approved ? 'btn-danger' : 'btn-outline'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setReviewForm(f => ({ ...f, approved: false }))}>❌ Reject</button>
            </div>
            {reviewForm.approved && (
              <div className="form-row">
                <div className="form-group">
                  <label>Disbursement Date</label>
                  <input type="date" value={reviewForm.disbursementDate} onChange={e => setReviewForm(f => ({ ...f, disbursementDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Repayment Start Date</label>
                  <input type="date" value={reviewForm.repaymentStartDate} onChange={e => setReviewForm(f => ({ ...f, repaymentStartDate: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Comment</label>
              <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} rows={3} placeholder="Add a note..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`btn ${reviewForm.approved ? 'btn-success' : 'btn-danger'}`} onClick={handleReview} disabled={submitting}>
                {submitting ? 'Submitting...' : reviewForm.approved ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
              </button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment schedule modal */}
      {scheduleModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Repayment Schedule — {scheduleModal.loan.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setScheduleModal(null)}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              ₦{Number(scheduleModal.loan.amount).toLocaleString('en-NG')} · Outstanding: <strong style={{ color: '#ef4444' }}>₦{Number(scheduleModal.loan.outstandingBalance).toLocaleString('en-NG')}</strong>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>#</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Due</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Amount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Action</th>
                </tr></thead>
                <tbody>
                  {scheduleModal.schedule.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{r.installmentNumber}</td>
                      <td style={{ padding: '8px 12px' }}>{format(new Date(r.dueDate), 'dd MMM yyyy')}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>₦{Number(r.amount).toLocaleString('en-NG')}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.status === 'PAID' ? '#dcfce7' : r.status === 'OVERDUE' ? '#fee2e2' : '#fef3c7', color: r.status === 'PAID' ? '#16a34a' : r.status === 'OVERDUE' ? '#dc2626' : '#d97706' }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {r.status !== 'PAID' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(scheduleModal.loan.id, r.id)}>Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setScheduleModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoans;
