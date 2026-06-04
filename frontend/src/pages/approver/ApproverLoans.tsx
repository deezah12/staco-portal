import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingLoansForApprover, getLoanApprovalHistory, unitHeadLoanReview, divHeadLoanReview, mdLoanReview } from '../../api/loanApi';
import { LoanRequest, loanStatusMeta } from '../../types/loan';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const ApproverLoans: React.FC = () => {
  const { approvalLevel } = useAuth();
  const [loans, setLoans]       = useState<LoanRequest[]>([]);
  const [history, setHistory]   = useState<LoanRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState<LoanRequest | null>(null);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    Promise.all([getPendingLoansForApprover(), getLoanApprovalHistory()])
      .then(([p, h]) => { setLoans(p.data); setHistory(h.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleReview = async (approved: boolean) => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      if (approvalLevel === 'UNIT_HEAD')     await unitHeadLoanReview(reviewing.id, approved, comment);
      else if (approvalLevel === 'DIV_HEAD') await divHeadLoanReview(reviewing.id, approved, comment);
      else                                   await mdLoanReview(reviewing.id, approved, comment);
      const [p, h] = await Promise.all([getPendingLoansForApprover(), getLoanApprovalHistory()]);
      setLoans(p.data);
      setHistory(h.data);
      toast.success(`Loan ${approved ? 'approved' : 'rejected'}`);
      setReviewing(null); setComment('');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Action failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  const levelLabel = approvalLevel === 'MD' ? 'MD' : approvalLevel === 'DIV_HEAD' ? 'Divisional Head' : 'Unit Head';
  const reviewStatus = (loan: LoanRequest) => approvalLevel === 'UNIT_HEAD' ? loan.unitHeadStatus : approvalLevel === 'DIV_HEAD' ? loan.divHeadStatus : loan.mdStatus;
  const reviewComment = (loan: LoanRequest) => approvalLevel === 'UNIT_HEAD' ? loan.unitHeadComment : approvalLevel === 'DIV_HEAD' ? loan.divHeadComment : loan.mdComment;
  const reviewedAt = (loan: LoanRequest) => approvalLevel === 'UNIT_HEAD' ? loan.unitHeadReviewedAt : approvalLevel === 'DIV_HEAD' ? loan.divHeadReviewedAt : loan.mdReviewedAt;
  const TabBtn = ({ id, label, count }: { id: 'pending' | 'history'; label: string; count: number }) => (
    <button onClick={() => setTab(id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
      cursor: 'pointer', fontWeight: 600, fontSize: 13,
      background: tab === id ? '#4f9cff' : '#f1f5f9',
      color: tab === id ? '#fff' : '#374151' }}>
      {label} {count > 0 && <span style={{ background: tab === id ? 'rgba(255,255,255,0.3)' : '#64748b',
        color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{count}</span>}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Loan Approvals</h1>
        <p>{levelLabel} · {loans.length} loan{loans.length !== 1 ? 's' : ''} awaiting your review</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <TabBtn id="pending" label="Pending" count={loans.length} />
        <TabBtn id="history" label="History" count={history.length} />
      </div>

      {tab === 'pending' && (loans.length === 0
        ? <div className="card"><div className="empty-state"><div className="icon">🎉</div>No pending loan approvals</div></div>
        : <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            {loans.map(loan => {
              const s = loanStatusMeta[loan.status];
              return (
                <div className="card" key={loan.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.employee.fullName}</div>
                      <div style={{ fontSize: 13, color:'#64748b', marginTop: 2 }}>
                        {loan.employee.department} · Grade: {loan.employee.grade?.name || 'N/A'}
                      </div>
                      <div style={{ marginTop: 10, display:'flex', gap: 12, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ background: s.bg, color: s.color, padding:'2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>₦{Number(loan.amount).toLocaleString('en-NG')}</span>
                        <span style={{ fontSize: 13, color:'#64748b' }}>· {loan.repaymentMonths} months · ₦{Number(loan.monthlyDeduction).toLocaleString('en-NG')}/mo</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6, color:'#64748b' }}>
                        Purpose: {loan.purpose} · Applied: {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                      </div>
                      {loan.reason && (
                        <div style={{ fontSize: 13, marginTop: 6, background:'#f8fafc', padding:'6px 10px', borderRadius: 6 }}>
                          💬 {loan.reason}
                        </div>
                      )}
                      {loan.guarantors?.length > 0 && (
                        <div style={{ marginTop: 8, display:'flex', gap: 6, flexWrap:'wrap' }}>
                          {loan.guarantors.map(g => (
                            <span key={g.id} style={{ fontSize: 11, padding:'2px 8px', borderRadius: 20, fontWeight: 600,
                              background: g.status === 'SIGNED' ? '#dcfce7' : '#fef3c7',
                              color: g.status === 'SIGNED' ? '#16a34a' : '#d97706' }}>
                              G{g.slotNumber}: {g.guarantor.fullName} — {g.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setReviewing(loan); setComment(''); }}>
                      ✍️ Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {tab === 'history' && (history.length === 0
        ? <div className="card"><div className="empty-state"><div className="icon">📭</div>No loan approval history</div></div>
        : <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            {history.map(loan => {
              const status = reviewStatus(loan);
              const note = reviewComment(loan);
              const date = reviewedAt(loan);
              return (
                <div className="card" key={loan.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.employee.fullName}</div>
                      <div style={{ fontSize: 13, color:'#64748b', marginTop: 2 }}>
                        {loan.employee.department} · ₦{Number(loan.amount).toLocaleString('en-NG')} · {loan.repaymentMonths} months
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6, color:'#64748b' }}>
                        Applied {format(new Date(loan.createdAt), 'dd MMM yyyy')}
                        {date && <> · Reviewed {format(new Date(date), 'dd MMM yyyy')}</>}
                      </div>
                      {note && (
                        <div style={{ fontSize: 13, marginTop: 6, background:'#f8fafc', padding:'6px 10px', borderRadius: 6 }}>
                          💬 {note}
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                      color: status === 'APPROVED' ? '#16a34a' : '#dc2626'
                    }}>{status}</span>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {reviewing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Loan Review — {reviewing.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>₦{Number(reviewing.amount).toLocaleString('en-NG')}</div>
              <div style={{ fontSize: 13, color:'#64748b', marginTop: 4 }}>
                {reviewing.repaymentMonths} months · ₦{Number(reviewing.monthlyDeduction).toLocaleString('en-NG')}/month
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Reason: {reviewing.reason}</div>
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={3} placeholder="Add a note..." style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => handleReview(true)} disabled={submitting}>✅ Approve</button>
              <button className="btn btn-danger"  onClick={() => handleReview(false)} disabled={submitting}>❌ Reject</button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApproverLoans;
