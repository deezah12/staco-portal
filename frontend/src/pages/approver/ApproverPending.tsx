import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingForApprover, unitHeadReview, divHeadReview, hodConfirmResumption } from '../../api/leaveApi';
import { LeaveRequest, leaveTypeLabel } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const ApproverPending: React.FC = () => {
  const { approvalLevel } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPendingForApprover().then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, []);

  const handleReview = async (approved: boolean) => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      if (approvalLevel === 'UNIT_HEAD') await unitHeadReview(reviewing.id, approved, comment);
      else await divHeadReview(reviewing.id, approved, comment);
      setRequests(prev => prev.filter(r => r.id !== reviewing.id));
      toast.success(`Request ${approved ? 'approved' : 'rejected'}`);
      setReviewing(null); setComment('');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Action failed');
    } finally { setSubmitting(false); }
  };

  const handleConfirmResumption = async (id: number) => {
    try {
      await hodConfirmResumption(id);
      toast.success('Resumption confirmed');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, resumedConfirmedByHod: true } : r));
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  const levelLabel = approvalLevel === 'UNIT_HEAD' ? 'Unit Head' : 'Divisional Head';

  return (
    <div>
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p>{levelLabel} · {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting review</p>
      </div>

      {requests.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">🎉</div>All caught up!</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map(r => (
            <div className="card" key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.employee.fullName}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{r.employee.department} · {r.employee.email}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-pending">{leaveTypeLabel[r.leaveType]}</span>
                    <span style={{ fontSize: 13 }}>📅 {format(new Date(r.startDate), 'dd MMM yyyy')} → {format(new Date(r.endDate), 'dd MMM yyyy')}</span>
                    <span style={{ fontSize: 13 }}>⏱ {r.totalDays} day{r.totalDays > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>👤 Relief: <strong>{r.reliefStaffName}</strong></div>
                  {r.reason && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>💬 {r.reason}</div>}
                  {r.handoverNoteFileName && <div style={{ fontSize: 12, color: '#4f9cff', marginTop: 6 }}>📎 {r.handoverNoteFileName}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {((approvalLevel === 'UNIT_HEAD' && r.status === 'PENDING_UNIT_HEAD') ||
                    (approvalLevel === 'DIV_HEAD'  && r.status === 'PENDING_DIV_HEAD')) && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setReviewing(r); setComment(''); }}>✍️ Review</button>
                  )}
                  {r.status === 'ACTIVE' && !r.resumedConfirmedByHod && (
                    <button className="btn btn-success btn-sm" onClick={() => handleConfirmResumption(r.id)}>✅ Confirm Resumption</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Review — {reviewing.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>{leaveTypeLabel[reviewing.leaveType]}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {format(new Date(reviewing.startDate), 'dd MMM')} – {format(new Date(reviewing.endDate), 'dd MMM yyyy')} · {reviewing.totalDays} days
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Relief: <strong>{reviewing.reliefStaffName}</strong></div>
              {reviewing.handoverNoteFileName && <div style={{ fontSize: 12, color: '#4f9cff', marginTop: 4 }}>📎 {reviewing.handoverNoteFileName}</div>}
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add a note..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
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
export default ApproverPending;
