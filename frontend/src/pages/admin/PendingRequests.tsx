import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingHr, hrProcessLeave } from '../../api/leaveApi';
import { LeaveRequest } from '../../types';
import { format } from 'date-fns';

const PendingRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPendingHr().then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, []);

  const handleReview = async (approved: boolean) => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      await hrProcessLeave(reviewing.id, comment);
      setRequests(prev => prev.filter(r => r.id !== reviewing.id));
      toast.success(`Request ${approved ? 'approved' : 'rejected'} successfully`);
      setReviewing(null);
      setComment('');
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(typeof d === 'string' ? d : d?.error || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p>{requests.length} request{requests.length !== 1 ? 's' : ''} awaiting review</p>
      </div>

      {requests.length === 0 ? (
        <div className="card">
          <div className="empty-state"><div className="icon">🎉</div><p>All caught up — no pending requests!</p></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {requests.map(r => (
            <div className="card" key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{r.employee.fullName}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{r.employee.email} · {r.employee.department || 'No dept'}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${r.leaveType.toLowerCase()}`}>{r.leaveType}</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      📅 {format(new Date(r.startDate), 'dd MMM yyyy')} → {format(new Date(r.endDate), 'dd MMM yyyy')}
                    </span>
                    <span style={{ fontSize: 13, color: '#374151' }}>⏱ {r.totalDays} day{r.totalDays > 1 ? 's' : ''}</span>
                  </div>
                  {r.reason && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 6 }}>
                      💬 {r.reason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={() => { setReviewing(r); setComment(''); }}>
                    ✅ Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Review Request</h2>
              <button className="modal-close" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600 }}>{reviewing.employee.fullName}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {reviewing.leaveType} · {format(new Date(reviewing.startDate), 'dd MMM')} – {format(new Date(reviewing.endDate), 'dd MMM yyyy')} · {reviewing.totalDays} days
              </div>
              {reviewing.reason && <div style={{ fontSize: 13, marginTop: 8, color: '#374151' }}>{reviewing.reason}</div>}
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Add a note to the employee..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => handleReview(true)} disabled={submitting}>✅ Approve</button>
              <button className="btn btn-danger" onClick={() => handleReview(false)} disabled={submitting}>❌ Reject</button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequests;
