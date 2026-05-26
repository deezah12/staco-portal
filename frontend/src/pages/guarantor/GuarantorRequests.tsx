import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingGuarantorRequests, getMyGuarantorRequests, respondAsGuarantor } from '../../api/loanApi';
import { LoanGuarantor } from '../../types/loan';
import { format } from 'date-fns';

const GuarantorRequests: React.FC = () => {
  const [pending, setPending]   = useState<LoanGuarantor[]>([]);
  const [history, setHistory]   = useState<LoanGuarantor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [responding, setResponding] = useState<LoanGuarantor | null>(null);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab]           = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    Promise.all([getPendingGuarantorRequests(), getMyGuarantorRequests()])
      .then(([p, h]) => { setPending(p.data); setHistory(h.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (accept: boolean) => {
    if (!responding) return;
    setSubmitting(true);
    try {
      await respondAsGuarantor(responding.loanRequest!.id, accept, comment);
      setPending(prev => prev.filter(g => g.id !== responding.id));
      toast.success(accept ? 'You have signed as guarantor' : 'You have declined this request');
      setResponding(null); setComment('');
      // Refresh history
      const h = await getMyGuarantorRequests();
      setHistory(h.data);
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to respond');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  const TabBtn = ({ id, label, count }: { id: 'pending' | 'history'; label: string; count?: number }) => (
    <button onClick={() => setTab(id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
      cursor: 'pointer', fontWeight: 600, fontSize: 13,
      background: tab === id ? '#4f9cff' : '#f1f5f9',
      color: tab === id ? '#fff' : '#374151' }}>
      {label}
      {count != null && count > 0 && (
        <span style={{ background: tab === id ? 'rgba(255,255,255,0.3)' : '#ef4444',
          color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{count}</span>
      )}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Guarantor Requests</h1>
        <p>Loan guarantee requests from your colleagues</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <TabBtn id="pending" label="Pending" count={pending.length} />
        <TabBtn id="history" label="History" />
      </div>

      {tab === 'pending' && (
        pending.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">🎉</div>No pending guarantor requests</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pending.map(g => (
                <div className="card" key={g.id} style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{g.loanRequest?.employee.fullName}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                        {g.loanRequest?.employee.department} · Guarantor Slot {g.slotNumber}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>₦{Number(g.loanRequest?.amount).toLocaleString('en-NG')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Duration</div>
                          <div style={{ fontWeight: 600 }}>{g.loanRequest?.repaymentMonths} months</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Monthly</div>
                          <div style={{ fontWeight: 600 }}>₦{Number(g.loanRequest?.monthlyDeduction).toLocaleString('en-NG')}</div>
                        </div>
                      </div>
                      {g.loanRequest?.reason && (
                        <div style={{ marginTop: 8, fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                          Reason: {g.loanRequest.reason}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        Requested {format(new Date(g.invitedAt), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm"
                      onClick={() => { setResponding(g); setComment(''); }}>
                      ✍️ Respond
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === 'history' && (
        history.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">📭</div>No guarantor history</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(g => (
                <div className="card" key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{g.loanRequest?.employee.fullName}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        ₦{Number(g.loanRequest?.amount).toLocaleString('en-NG')} · {g.loanRequest?.repaymentMonths} months
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: g.status === 'SIGNED' ? '#dcfce7' : g.status === 'DECLINED' ? '#fee2e2' : '#fef3c7',
                      color: g.status === 'SIGNED' ? '#16a34a' : g.status === 'DECLINED' ? '#dc2626' : '#d97706'
                    }}>{g.status}</span>
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* Respond Modal */}
      {responding && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Guarantor Response</h2>
              <button className="modal-close" onClick={() => setResponding(null)}>✕</button>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>⚠️ By signing, you agree to guarantee this loan</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                If <strong>{responding.loanRequest?.employee.fullName}</strong> defaults, you may be held responsible.
              </div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Amount: <strong>₦{Number(responding.loanRequest?.amount).toLocaleString('en-NG')}</strong> ·
                Monthly: <strong>₦{Number(responding.loanRequest?.monthlyDeduction).toLocaleString('en-NG')}</strong> ·
                {responding.loanRequest?.repaymentMonths} months
              </div>
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={3} placeholder="Add a comment..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => handleRespond(true)} disabled={submitting}>✅ Sign as Guarantor</button>
              <button className="btn btn-danger"  onClick={() => handleRespond(false)} disabled={submitting}>❌ Decline</button>
              <button className="btn btn-outline" onClick={() => setResponding(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GuarantorRequests;
