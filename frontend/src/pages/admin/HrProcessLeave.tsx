import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingHr, hrProcessLeave, hrConfirmResumption, getOverstayedLeaves } from '../../api/leaveApi';
import { LeaveRequest, leaveTypeLabel } from '../../types';
import { format } from 'date-fns';

const HrProcessLeave: React.FC = () => {
  const [pending, setPending]     = useState<LeaveRequest[]>([]);
  const [overstayed, setOverstayed] = useState<LeaveRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState<LeaveRequest | null>(null);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab]             = useState<'pending' | 'overstayed'>('pending');

  useEffect(() => {
    Promise.all([getPendingHr(), getOverstayedLeaves()])
      .then(([p, o]) => { setPending(p.data); setOverstayed(o.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleProcess = async () => {
    if (!processing) return;
    setSubmitting(true);
    try {
      await hrProcessLeave(processing.id, comment);
      setPending(prev => prev.filter(r => r.id !== processing.id));
      toast.success('Leave processed — confirmation email sent');
      setProcessing(null); setComment('');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleConfirmResumption = async (id: number) => {
    try {
      await hrConfirmResumption(id);
      setOverstayed(prev => prev.map(r => r.id === id ? { ...r, resumedConfirmedByHr: true } : r));
      toast.success('Resumption confirmed by HR');
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  const TabBtn = ({ id, label, count }: { id: 'pending' | 'overstayed'; label: string; count: number }) => (
    <button onClick={() => setTab(id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
      cursor: 'pointer', fontWeight: 600, fontSize: 13,
      background: tab === id ? '#4f9cff' : '#f1f5f9',
      color: tab === id ? '#fff' : '#374151' }}>
      {label} {count > 0 && <span style={{ background: tab === id ? 'rgba(255,255,255,0.3)' : '#ef4444',
        color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{count}</span>}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Leave Processing</h1>
        <p>Process approved leave requests and track resumptions</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <TabBtn id="pending"    label="Pending Processing" count={pending.length} />
        <TabBtn id="overstayed" label="Overstayed"         count={overstayed.length} />
      </div>

      {tab === 'pending' && (
        pending.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">🎉</div>No pending leave to process</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pending.map(r => (
                <div className="card" key={r.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.employee.fullName}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{r.employee.department}</div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-pending">{leaveTypeLabel[r.leaveType]}</span>
                        <span style={{ fontSize: 13 }}>📅 {format(new Date(r.startDate), 'dd MMM yyyy')} → {format(new Date(r.endDate), 'dd MMM yyyy')}</span>
                        <span style={{ fontSize: 13 }}>⏱ {r.totalDays} days</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>👤 Relief: <strong>{r.reliefStaffName}</strong></div>
                      {r.leaveType === 'ANNUAL' && r.totalDays >= 10 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600, background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
                          💰 Payment applicable — will be sent to Accounts
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setProcessing(r); setComment(''); }}>
                      ⚙️ Process
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === 'overstayed' && (
        overstayed.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">✅</div>No overstayed leaves</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {overstayed.map(r => (
                <div className="card" key={r.id} style={{ borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.employee.fullName}
                        <span style={{ marginLeft: 10, fontSize: 12, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>OVERSTAYED</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{r.employee.department}</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        Leave ended: <strong>{format(new Date(r.endDate), 'dd MMM yyyy')}</strong>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>
                        HR confirmed: {r.resumedConfirmedByHr ? '✅' : '❌'} · HOD confirmed: {r.resumedConfirmedByHod ? '✅' : '❌'}
                      </div>
                    </div>
                    {!r.resumedConfirmedByHr && (
                      <button className="btn btn-success btn-sm" onClick={() => handleConfirmResumption(r.id)}>
                        ✅ Mark Resumed (HR)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* Process Modal */}
      {processing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Process Leave — {processing.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setProcessing(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>{leaveTypeLabel[processing.leaveType]}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {format(new Date(processing.startDate), 'dd MMM')} – {format(new Date(processing.endDate), 'dd MMM yyyy')} · {processing.totalDays} days
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Resumption: <strong>{format(new Date(new Date(processing.endDate).getTime() + 86400000), 'dd MMM yyyy')}</strong></div>
              {processing.leaveType === 'ANNUAL' && processing.totalDays >= 10 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>💰 Payment request will be raised to Accounts automatically</div>
              )}
            </div>
            <div className="form-group">
              <label>HR Note (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Any note for this leave..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleProcess} disabled={submitting}>
                {submitting ? 'Processing...' : '✅ Confirm & Send Email'}
              </button>
              <button className="btn btn-outline" onClick={() => setProcessing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HrProcessLeave;
