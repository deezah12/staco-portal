import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllRequests, getLeavePayment, downloadLeavePaymentEop, downloadHandoverNote } from '../../api/leaveApi';
import { LeavePaymentRequest, LeaveRequest, LeaveStatus } from '../../types';
import { format } from 'date-fns';

const AllRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [payment, setPayment] = useState<LeavePaymentRequest | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    getAllRequests().then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected?.paymentRequestSent) {
      setPayment(null);
      setPaymentError('');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');
    getLeavePayment(selected.id)
      .then(r => setPayment(r.data))
      .catch((err: any) => {
        const d = err.response?.data;
        setPayment(null);
        setPaymentError(typeof d === 'string' ? d : d?.error || 'Payment details are not available.');
      })
      .finally(() => setPaymentLoading(false));
  }, [selected]);

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  const downloadEop = async () => {
    if (!selected) return;
    try {
      const res = await downloadLeavePaymentEop(selected.id);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = payment?.eopDocumentFileName || 'eop-document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(typeof d === 'string' ? d : d?.error || 'Failed to download EOP');
    }
  };

  const downloadHandover = async () => {
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

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>All Requests</h1>
        <p>Complete history of leave requests across the company</p>
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['ALL', 'PENDING_UNIT_HEAD', 'PENDING_DIV_HEAD', 'PENDING_HR', 'ACTIVE', 'RESUMED', 'REJECTED', 'CANCELLED'] as const).map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>No requests found</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Dept</th><th>Type</th>
                  <th>From</th><th>To</th><th>Days</th><th>Status</th><th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.employee.fullName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.employee.email}</div>
                    </td>
                    <td style={{ color: '#64748b' }}>{r.employee.department || '—'}</td>
                    <td><span className={`badge badge-${r.leaveType.toLowerCase()}`}>{r.leaveType}</span></td>
                    <td>{format(new Date(r.startDate), 'dd MMM yyyy')}</td>
                    <td>{format(new Date(r.endDate), 'dd MMM yyyy')}</td>
                    <td>{r.totalDays}</td>
                    <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{format(new Date(r.createdAt), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Leave Request — {selected.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.leaveType} · {selected.status}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {format(new Date(selected.startDate), 'dd MMM yyyy')} → {format(new Date(selected.endDate), 'dd MMM yyyy')} · {selected.totalDays} day{selected.totalDays !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Relief: <strong>{selected.reliefStaffName}</strong></div>
              {selected.reason && <div style={{ fontSize: 13, marginTop: 6 }}>Reason: {selected.reason}</div>}
              {selected.handoverNoteFileName && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={downloadHandover}>
                  Download Handover: {selected.handoverNoteFileName}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Unit Head', status: selected.unitHeadStatus, reviewer: selected.unitHeadReviewer?.fullName, comment: selected.unitHeadComment, at: selected.unitHeadReviewedAt },
                { label: 'Divisional Head', status: selected.divHeadStatus, reviewer: selected.divHeadReviewer?.fullName, comment: selected.divHeadComment, at: selected.divHeadReviewedAt },
                { label: 'HR Processing', status: selected.hrStatus, reviewer: selected.hrProcessor?.fullName, comment: selected.hrComment, at: selected.hrProcessedAt },
              ].map(step => (
                <div key={step.label} style={{ border: '1px solid #f1f5f9', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{step.label}: {step.status}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {step.reviewer || 'N/A'}{step.at ? ` · ${format(new Date(step.at), 'dd MMM yyyy')}` : ''}
                  </div>
                  {step.comment && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>“{step.comment}”</div>}
                </div>
              ))}
            </div>

            {selected.paymentRequestSent && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>EOP / Payment</div>
                {paymentLoading ? (
                  <div style={{ fontSize: 13 }}>Loading payment details...</div>
                ) : payment ? (
                  <div style={{ fontSize: 13, color: '#1e3a8a' }}>
                    <div>Amount: <strong>₦{Number(payment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
                    <div>Status: <strong>{payment.status}</strong></div>
                    {payment.processedByAccount?.fullName && <div>Processed by: {payment.processedByAccount.fullName}</div>}
                    {payment.processedAt && <div>Processed: {format(new Date(payment.processedAt), 'dd MMM yyyy')}</div>}
                    {payment.accountNote && <div>Account note: {payment.accountNote}</div>}
                    {payment.eopDocumentFileName ? (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={downloadEop}>
                        Download EOP: {payment.eopDocumentFileName}
                      </button>
                    ) : (
                      <div style={{ marginTop: 4 }}>EOP document has not been uploaded yet.</div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13 }}>{paymentError || 'Payment details are not available.'}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRequests;
