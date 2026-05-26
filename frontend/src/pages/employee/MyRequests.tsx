import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getMyRequests, cancelLeave } from '../../api/leaveApi';
import { LeaveRequest, leaveTypeLabel, statusLabel, statusBadgeClass } from '../../types';
import { format } from 'date-fns';

const MyRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    getMyRequests().then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await cancelLeave(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
      toast.success('Leave request cancelled');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to cancel');
    }
  };

  const ApprovalStep = ({ label, status, reviewer, comment, reviewedAt }: {
    label: string; status: string; reviewer?: string; comment?: string; reviewedAt?: string;
  }) => {
    const colours: Record<string, string> = {
      PENDING: '#f59e0b', APPROVED: '#22c55e', REJECTED: '#ef4444', SKIPPED: '#94a3b8'
    };
    const icons: Record<string, string> = {
      PENDING: '⏳', APPROVED: '✅', REJECTED: '❌', SKIPPED: '⏭️'
    };
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%',
          background: colours[status] || '#94a3b8', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
          {icons[status] || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {status === 'SKIPPED' ? 'Skipped (not applicable)' :
             status === 'PENDING' ? 'Awaiting review' :
             `${status} by ${reviewer || 'N/A'} ${reviewedAt ? '· ' + format(new Date(reviewedAt), 'dd MMM yyyy') : ''}`}
          </div>
          {comment && <div style={{ fontSize: 12, color: '#374151', marginTop: 2, fontStyle: 'italic' }}>"{comment}"</div>}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Leave Requests</h1>
        <p>{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
      </div>

      {requests.length === 0 ? (
        <div className="card">
          <div className="empty-state"><div className="icon">📭</div>No leave requests yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map(r => (
            <div className="card" key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${statusBadgeClass[r.status]}`}>{statusLabel[r.status]}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{leaveTypeLabel[r.leaveType]}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                    📅 {format(new Date(r.startDate), 'dd MMM yyyy')} → {format(new Date(r.endDate), 'dd MMM yyyy')} · {r.totalDays} day{r.totalDays > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Relief: {r.reliefStaffName} · Applied {format(new Date(r.createdAt), 'dd MMM yyyy')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(r.status === 'PENDING_UNIT_HEAD' || r.status === 'PENDING_DIV_HEAD') && (
                    <button className="btn btn-danger btn-sm"
                      onClick={e => { e.stopPropagation(); handleCancel(r.id); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{leaveTypeLabel[selected.leaveType]}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 20, background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Period</div>
                  <div style={{ fontWeight: 600 }}>{format(new Date(selected.startDate), 'dd MMM')} – {format(new Date(selected.endDate), 'dd MMM yyyy')}</div></div>
                <div><div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Days</div>
                  <div style={{ fontWeight: 600 }}>{selected.totalDays}</div></div>
                <div><div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Relief Staff</div>
                  <div style={{ fontWeight: 600 }}>{selected.reliefStaffName}</div></div>
              </div>
              {selected.reason && <div style={{ marginTop: 10, fontSize: 13, color: '#374151' }}>Reason: {selected.reason}</div>}
              {selected.handoverNoteFileName && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#4f9cff' }}>📎 {selected.handoverNoteFileName}</div>
              )}
            </div>

            <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 14 }}>Approval Progress</div>
            <ApprovalStep label="Unit Head" status={selected.unitHeadStatus}
              reviewer={selected.unitHeadReviewer?.fullName} comment={selected.unitHeadComment}
              reviewedAt={selected.unitHeadReviewedAt} />
            <ApprovalStep label="Divisional Head" status={selected.divHeadStatus}
              reviewer={selected.divHeadReviewer?.fullName} comment={selected.divHeadComment}
              reviewedAt={selected.divHeadReviewedAt} />
            <ApprovalStep label="HR Processing" status={selected.hrStatus}
              reviewer={selected.hrProcessor?.fullName} comment={selected.hrComment}
              reviewedAt={selected.hrProcessedAt} />

            {selected.paymentApplicable && (
              <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d' }}>
                💰 Annual leave allowance applicable — payment request raised to Accounts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
