import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getAllRequests } from '../../api/leaveApi';
import { getAllEmployees } from '../../api/loanApi';
import { DashboardStats, LeaveRequest } from '../../types';
import { format } from 'date-fns';

type ActiveView = 'pending' | 'all' | 'approved' | 'employees';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeesLoaded, setEmployeesLoaded] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('pending');

    useEffect(() => {
        Promise.all([getDashboardStats(), getAllRequests()])
            .then(([s, r]) => { setStats(s.data); setAllRequests(r.data); })
            .finally(() => setLoading(false));
    }, []);

    const handleEmployeesClick = () => {
        setActiveView('employees');
        if (!employeesLoaded) {
            setEmployeesLoading(true);
            getAllEmployees()
                .then(r => { setEmployees(r.data); setEmployeesLoaded(true); })
                .catch(() => {})
                .finally(() => setEmployeesLoading(false));
        }
    };

    const pending = allRequests.filter(r => ['PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_HR'].includes(r.status));
    const approved = allRequests.filter(r => ['ACTIVE','RESUMED'].includes(r.status));

    const getDisplayedRequests = () => {
        switch (activeView) {
            case 'pending': return pending;
            case 'approved': return approved;
            case 'all': return allRequests;
            default: return [];
        }
    };

    const cardStyle = (view: ActiveView) => ({
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: activeView === view ? '2px solid #4f9cff' : '2px solid transparent',
        boxShadow: activeView === view ? '0 4px 16px rgba(79,156,255,0.2)' : undefined,
        background: activeView === view ? '#f0f7ff' : '#fff',
    });

    const activeLabel = (view: ActiveView) => (
        <div style={{ fontSize: 11, color: '#4f9cff', marginTop: 6, fontWeight: 600 }}>
            {activeView === view ? '▼ Viewing below' : 'Click to view →'}
        </div>
    );

    if (loading) return <div className="loading"><div className="spinner"/></div>;

    return (
        <div>
            <div className="page-header">
                <h1>Admin Dashboard</h1>
                <p>Click any card to explore that section</p>
            </div>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card" style={cardStyle('employees')} onClick={handleEmployeesClick}>
                        <span className="stat-icon">👥</span>
                        <div className="stat-label">Total Employees</div>
                        <div className="stat-value">{stats.totalEmployees}</div>
                        {activeLabel('employees')}
                    </div>
                    <div className="stat-card" style={cardStyle('all')} onClick={() => setActiveView('all')}>
                        <span className="stat-icon">📋</span>
                        <div className="stat-label">Total Requests</div>
                        <div className="stat-value">{stats.totalRequests}</div>
                        {activeLabel('all')}
                    </div>
                    <div className="stat-card" style={cardStyle('pending')} onClick={() => setActiveView('pending')}>
                        <span className="stat-icon">⏳</span>
                        <div className="stat-label">Pending</div>
                        <div className="stat-value" style={{ color: '#d97706' }}>{stats.pendingRequests}</div>
                        {activeLabel('pending')}
                    </div>
                    <div className="stat-card" style={cardStyle('approved')} onClick={() => setActiveView('approved')}>
                        <span className="stat-icon">✅</span>
                        <div className="stat-label">Approved</div>
                        <div className="stat-value" style={{ color: '#16a34a' }}>{stats.activeLeaves}</div>
                        {activeLabel('approved')}
                    </div>
                </div>
            )}

            {/* Dynamic section */}
            <div className="card">
                {/* ── Employees ─────────────────────────────────── */}
                {activeView === 'employees' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 16 }}>👥 All Employees</h3>
                            <span style={{ fontSize: 13, color: '#64748b' }}>{employees.length} total</span>
                        </div>
                        {employeesLoading ? (
                            <div className="loading"><div className="spinner"/></div>
                        ) : employees.length === 0 ? (
                            <div className="empty-state"><div className="icon">👤</div><p>No employees found</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Role</th><th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 34, height: 34, borderRadius: '50%',
                                                        background: `hsl(${(emp.id * 47) % 360}, 60%, 65%)`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0
                                                    }}>
                                                        {emp.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{emp.fullName}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: 13 }}>{emp.email}</td>
                                            <td>{emp.department || '—'}</td>
                                            <td>{emp.position || '—'}</td>
                                            <td>
                          <span style={{
                              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              background: emp.role === 'ADMIN' ? '#ede9fe' : '#dbeafe',
                              color: emp.role === 'ADMIN' ? '#7c3aed' : '#1d4ed8'
                          }}>{emp.role}</span>
                                            </td>
                                            <td>
                          <span style={{
                              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              background: emp.active ? '#dcfce7' : '#fee2e2',
                              color: emp.active ? '#16a34a' : '#dc2626'
                          }}>{emp.active ? 'Active' : 'Inactive'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* ── Leave requests ─────────────────────────────── */}
                {activeView !== 'employees' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 16 }}>
                                {activeView === 'pending' ? '⏳ Pending Approvals' : activeView === 'approved' ? '✅ Approved Requests' : '📋 All Requests'}
                            </h3>
                            {activeView === 'pending' && <Link to="/admin/pending" className="btn btn-primary btn-sm">Review All</Link>}
                            {activeView === 'all' && <Link to="/admin/requests" className="btn btn-outline btn-sm">Full View</Link>}
                        </div>
                        {getDisplayedRequests().length === 0 ? (
                            <div className="empty-state">
                                <div className="icon">{activeView === 'pending' ? '🎉' : '📭'}</div>
                                <p>{activeView === 'pending' ? 'No pending requests' : 'No requests found'}</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th>
                                        {activeView === 'pending' && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {getDisplayedRequests().slice(0, 10).map(r => (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.employee.fullName}</div>
                                                <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.employee.department}</div>
                                            </td>
                                            <td><span className={`badge badge-${r.leaveType.toLowerCase()}`}>{r.leaveType}</span></td>
                                            <td>{format(new Date(r.startDate), 'dd MMM yyyy')}</td>
                                            <td>{format(new Date(r.endDate), 'dd MMM yyyy')}</td>
                                            <td>{r.totalDays}</td>
                                            <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                                            {activeView === 'pending' && (
                                                <td><Link to="/admin/pending" className="btn btn-outline btn-sm">Review</Link></td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {getDisplayedRequests().length > 10 && (
                                    <div style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
                                        Showing 10 of {getDisplayedRequests().length} —{' '}
                                        <Link to={activeView === 'pending' ? '/admin/pending' : '/admin/requests'}
                                              style={{ color: '#4f9cff', fontWeight: 600 }}>View all</Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;