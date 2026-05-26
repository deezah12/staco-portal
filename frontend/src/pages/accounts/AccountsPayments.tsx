import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingPayments, processEop } from '../../api/leaveApi';
import { LeavePaymentRequest } from '../../types';
import { format } from 'date-fns';

const AccountsPayments: React.FC = () => {
  const [payments, setPayments] = useState<LeavePaymentRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<LeavePaymentRequest | null>(null);
  const [eopFile, setEopFile]   = useState<File | null>(null);
  const [note, setNote]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPendingPayments().then(r => setPayments(r.data)).finally(() => setLoading(false));
  }, []);

  const handleProcess = async () => {
    if (!selected || !eopFile) { toast.error('Please upload the EOP document'); return; }
    setSubmitting(true);
    try {
      await processEop(selected.id, note, eopFile);
      setPayments(prev => prev.filter(p => p.id !== selected.id));
      toast.success('EOP processed successfully');
      setSelected(null); setEopFile(null); setNote('');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to process EOP');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Leave Payment Requests</h1>
        <p>{payments.length} pending EOP payment{payments.length !== 1 ? 's' : ''}</p>
      </div>

      {payments.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">🎉</div>No pending payment requests</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {payments.map(p => (
            <div className="card" key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.employee.fullName}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{p.employee.department}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#059669' }}>₦{p.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Leave Period</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {format(new Date(p.leaveRequest.startDate), 'dd MMM')} – {format(new Date(p.leaveRequest.endDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Raised</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{format(new Date(p.createdAt), 'dd MMM yyyy')}</div>
                    </div>
                  </div>
                  {p.hrNote && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>HR Note: {p.hrNote}</div>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setSelected(p); setEopFile(null); setNote(''); }}>
                  📤 Upload EOP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Process EOP — {selected.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#059669' }}>₦{selected.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Annual Leave · {selected.leaveRequest.totalDays} days</div>
            </div>
            <div className="form-group">
              <label>Upload EOP Document <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ border: `2px dashed ${eopFile ? '#22c55e' : '#cbd5e1'}`,
                borderRadius: 10, padding: '16px', textAlign: 'center',
                background: eopFile ? '#f0fdf4' : '#f8fafc', cursor: 'pointer' }}>
                <input type="file" id="eopFile" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                  onChange={e => setEopFile(e.target.files?.[0] || null)} />
                <label htmlFor="eopFile" style={{ cursor: 'pointer' }}>
                  {eopFile
                    ? <><div style={{ fontSize: 20 }}>📎</div><div style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{eopFile.name}</div></>
                    : <><div style={{ fontSize: 24 }}>📤</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Click to upload EOP</div></>
                  }
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Account Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Payment reference or note..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleProcess} disabled={submitting || !eopFile}>
                {submitting ? 'Processing...' : '✅ Submit EOP'}
              </button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountsPayments;
