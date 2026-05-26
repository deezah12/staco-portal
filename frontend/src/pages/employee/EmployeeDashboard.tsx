import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyRequests, getMyBalance } from '../../api/leaveApi';
import { LeaveRequest, LeaveBalance, leaveTypeLabel, statusLabel, statusBadgeClass } from '../../types';
import { format } from 'date-fns';

const EmployeeDashboard: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance]   = useState<LeaveBalance | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getMyRequests(), getMyBalance()])
      .then(([r, b]) => { setRequests(r.data); setBalance(b.data); })
      .finally(() => setLoading(false));
  }, []);

  const pending = requests.filter(r => ['PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_HR'].includes(r.status)).length;
  const active  = requests.filter(r => r.status === 'ACTIVE').length;
  const recent  = requests.slice(0, 5);

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Dashboard</h1>
        <p>Overview of your leave activity</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{requests.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value">{pending}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Currently On Leave</div>
          <div className="stat-value">{active}</div>
        </div>
      </div>

      {balance && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight:700, fontSize:16 }}>Leave Balance</h3>
            <Link to="/employee/balance" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="balance-grid">
            {[
              { label:'Annual Leave', rem:balance.annualRemaining, used:balance.annualUsed, total:balance.annualTotal },
              { label:'Sick Leave',   rem:balance.sickRemaining,   used:balance.sickUsed,   total:balance.sickTotal },
              { label:'Casual Leave', rem:balance.casualRemaining, used:balance.casualUsed, total:balance.casualTotal },
              { label:'Exam Leave',   rem:balance.examRemaining,   used:balance.examUsed,   total:balance.examTotal },
            ].map(b => (
              <div className="balance-item" key={b.label}>
                <div className="label">{b.label}</div>
                <div className="used-total">
                  <span className="days remaining">{b.rem} days left</span>
                  <span className="days used">{b.used} used</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width:`${b.total > 0 ? (b.used / b.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight:700, fontSize:16 }}>Recent Requests</h3>
          <Link to="/employee/apply" className="btn btn-primary btn-sm">+ New Request</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div>No leave requests yet</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td>{leaveTypeLabel[r.leaveType]}</td>
                    <td>{format(new Date(r.startDate), 'dd MMM yyyy')}</td>
                    <td>{format(new Date(r.endDate), 'dd MMM yyyy')}</td>
                    <td>{r.totalDays}</td>
                    <td><span className={`badge ${statusBadgeClass[r.status]}`}>{statusLabel[r.status]}</span></td>
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

export default EmployeeDashboard;
