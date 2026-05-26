import React, { useEffect, useState } from 'react';
import { getAllRequests } from '../../api/leaveApi';
import { LeaveRequest, LeaveStatus } from '../../types';
import { format } from 'date-fns';

const AllRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRequests().then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

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
                  <tr key={r.id}>
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
    </div>
  );
};

export default AllRequests;
