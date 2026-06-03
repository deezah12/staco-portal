import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getAllRequests } from '../../api/leaveApi';
import { getAllEmployees } from '../../api/loanApi';
import { getDepartments } from '../../api/departmentApi';
import { DashboardStats, LeaveRequest } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import './AdminDashboard.css';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

type ActiveView = 'pending' | 'all' | 'approved' | 'employees';

const DEPT_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316'];

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats]                     = useState<DashboardStats | null>(null);
    const [allRequests, setAllRequests]         = useState<LeaveRequest[]>([]);
    const [employees, setEmployees]             = useState<any[]>([]);
    const [departments, setDepartments]         = useState<any[]>([]);
    const [employeesLoaded, setEmployeesLoaded] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [loading, setLoading]                 = useState(true);
    const [activeView, setActiveView]           = useState<ActiveView>('pending');
    const [processingId, setProcessingId]       = useState<number | null>(null);

    const now     = new Date();
    const hour    = now.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const [s, d] = await Promise.all([
                    getDashboardStats(),
                    getDepartments().catch(() => ({ data: [] })),
                ]);
                setStats(s.data);
                setDepartments(Array.isArray(d.data) ? d.data : []);
            } catch (e) {
                console.warn('Dashboard stats failed:', e);
            }

            // Load requests separately so it never crashes the page
            try {
                const r = await getAllRequests();
                setAllRequests(Array.isArray(r.data) ? r.data : []);
            } catch (e) {
                console.warn('getAllRequests failed — user may lack HR role');
                setAllRequests([]);
            }

            setLoading(false);
        };

        loadDashboard();
    }, []);


    const pending  = allRequests.filter(r => ['PENDING_UNIT_HEAD','PENDING_DIV_HEAD','PENDING_HR'].includes(r.status));
    const approved = allRequests.filter(r => ['ACTIVE','RESUMED'].includes(r.status));

    const getDisplayedRequests = () => {
        switch (activeView) {
            case 'pending':  return pending;
            case 'approved': return approved;
            case 'all':      return allRequests;
            default:         return [];
        }
    };

    // Leave trend — last 5 weeks
    const trendData = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (4 - i) * 7);
        const label = format(d, 'MMM d');
        const count = allRequests.filter(r => {
            const rd = new Date((r as any).createdAt || r.startDate);
            return Math.abs(rd.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
        }).length;
        return { name: label, value: count };
    });

    // Department donut
    const deptData = departments.slice(0, 6).map((d, i) => ({
        name: d.name.replace(/ UNIT| Unit/g, ''),
        value: employees.filter(e => e.department === d.name).length || Math.max(3, (i + 1) * 4),
        color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
    const deptTotal = deptData.reduce((a, d) => a + d.value, 0) || stats?.totalEmployees || 0;

    // Recent activity feed
    const recentActivity = allRequests.slice(0, 6).map(r => ({
        id: r.id,
        text: `${r.employee?.fullName} submitted a ${r.leaveType?.toLowerCase().replace('_',' ')} request`,
        time: (r as any).createdAt
            ? formatDistanceToNow(new Date((r as any).createdAt), { addSuffix: true })
            : 'recently',
        type: r.leaveType,
    }));

    if (loading) return <div className="loading"><div className="spinner"/></div>;

    return (
        <div className="dash-wrap">

            {/* Top bar */}
            <div className="dash-topbar">
                <div>
                    <h1 className="dash-title">{greeting}, Hadiza 👋</h1>
                    <p className="dash-sub">Here's what's happening across Statco HR today.</p>
                </div>
                <div className="dash-actions">
                    <div style={{ position:'relative' }}>
                        <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:14 }}>🔍</span>
                        <input className="dash-search" type="text" placeholder="Search anything..." />
                    </div>
                    <button className="dash-bell">
                        🔔
                        {pending.length > 0 && <span className="dash-bell-badge">{pending.length > 9 ? '9+' : pending.length}</span>}
                    </button>
                    <span className="dash-date">{format(now, 'EEEE, MMMM d, yyyy')}</span>
                    <button className="dash-add-btn" onClick={() => navigate('/admin/staff')}>+ Add Staff</button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="stats-row">
                    {([
                        { label:'Total Employees',  value:stats.totalEmployees,  sub:'↑ 8 this month',     subC:'c-green',  icon:'👥', bg:'bg-indigo', view:'employees', click: () => {} },
                        { label:'Active Employees', value:stats.totalEmployees,  sub:'90.3% of total',     subC:'c-green',  icon:'🟢', bg:'bg-green',  view:'all',       click: () => {} },
                        { label:'Departments',      value:departments.length,    sub:'Across organisation', subC:'c-slate',  icon:'🏢', bg:'bg-blue',   view:null,       click:() => {} },
                        { label:'Pending Requests', value:stats.pendingRequests, sub:'Needs your action',  subC:'c-amber',  icon:'⏳', bg:'bg-amber',  view:'pending',   click: () => {} },
                        { label:'On Leave Today',   value:stats.activeLeaves,    sub:'Leave',           subC:'c-rose',   icon:'📅', bg:'bg-rose',   view:'approved',  click: () => {} },
                        { label:'Total Requests',   value:stats.totalRequests,   sub:'All time',           subC:'c-teal',   icon:'📋', bg:'bg-teal',   view:null,        click: () => {} },
                    ] as const).map((st, i) => (
                        <div key={i} className={`stat-tile`} >
                            <div className={`stat-icon-box ${st.bg}`}>{st.icon}</div>
                            <div className="stat-lbl">{st.label}</div>
                            <div className="stat-num">{st.value}</div>
                            <div className={`stat-hint ${st.subC}`}>{st.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Middle row */}
            <div className="mid-row">

                {/* Pending approvals */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">
                            📋 Pending Approvals <span className="pending-badge">{pending.length}</span>
                        </h3>
                        <Link to="/admin/pending" className="dash-card-link">View all requests →</Link>
                    </div>
                    {pending.length === 0 ? (
                        <div className="empty-center">
                            <div style={{ fontSize: 36 }}>🎉</div>
                            <p>No pending requests — all caught up!</p>
                        </div>
                    ) : (
                        <>
                            {pending.slice(0, 4).map(r => (
                                <div key={r.id} className="pending-row">
                                    <div className="pending-avatar" style={{ background:`hsl(${(r.id*47)%360},60%,60%)` }}>
                                        {r.employee?.fullName?.charAt(0)}
                                    </div>
                                    <div className="pending-info">
                                        <div className="pending-name">{r.employee?.fullName}</div>
                                        <div className="pending-dept">{r.employee?.department}</div>
                                    </div>
                                    <span className={`leave-badge ${r.leaveType==='ANNUAL'?'lb-annual':r.leaveType==='SICK'?'lb-sick':'lb-other'}`}>
                  {r.leaveType?.replace('_',' ')} Leave
                </span>
                                    <span className="pending-time">
                  {(r as any).createdAt ? formatDistanceToNow(new Date((r as any).createdAt),{addSuffix:true}) : 'recently'}
                </span>
                                    <div style={{ display:'flex', gap:8 }}>
                                        <Link to="/admin/pending" className="action-approve">Approve</Link>
                                        <Link to="/admin/pending" className="action-reject">Reject</Link>
                                    </div>
                                </div>
                            ))}
                            {pending.length > 4 && (
                                <p className="pending-show-more">Showing 4 of {pending.length} requests</p>
                            )}
                        </>
                    )}
                </div>

                {/* Quick actions */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Quick Actions</h3>
                    </div>
                    <div className="qa-grid">
                        {[
                            { icon:'👤', label:'Add Staff',        to:'/admin/staff',         bg:'bg-indigo' },
                            { icon:'📅', label:'Process Leave',    to:'/admin/process-leave', bg:'bg-green'  },
                            { icon:'📢', label:'Announcement',     to:'/admin/staff',         bg:'bg-amber'  },
                            { icon:'🎓', label:'Assign Grade',     to:'/admin/staff',         bg:'bg-teal'   },
                            { icon:'📊', label:'Generate Report',  to:'/admin/reports',       bg:'bg-rose'   },
                            { icon:'✅', label:'Approve Requests', to:'/admin/pending',       bg:'bg-green'  },
                        ].map(a => (
                            <Link key={a.label} to={a.to} className="qa-tile">
                                <div className={`qa-icon ${a.bg}`}>{a.icon}</div>
                                <span className="qa-label">{a.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dynamic table section */}
            <div className="dyn-section">
                {activeView === 'employees' && (
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">👥 All Employees</h3>
                            <span style={{ fontSize:13, color:'#94a3b8' }}>{employees.length} total</span>
                        </div>
                        {employeesLoading ? (
                            <div className="loading"><div className="spinner"/></div>
                        ) : employees.length === 0 ? (
                            <div className="empty-state"><div className="icon">👤</div><p>No employees found</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Role</th><th>Status</th></tr></thead>
                                    <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                    <div style={{ width:32,height:32,borderRadius:'50%',background:`hsl(${(emp.id*47)%360},60%,65%)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0 }}>
                                                        {emp.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight:600 }}>{emp.fullName}</span>
                                                </div>
                                            </td>
                                            <td style={{ color:'#64748b', fontSize:13 }}>{emp.email}</td>
                                            <td>{emp.department || '—'}</td>
                                            <td>{emp.position || '—'}</td>
                                            <td>
                        <span style={{ padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:emp.role==='ADMIN'?'#ede9fe':'#dbeafe',color:emp.role==='ADMIN'?'#7c3aed':'#1d4ed8' }}>
                          {emp.role}
                        </span>
                                            </td>
                                            <td>
                        <span style={{ padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:emp.active?'#dcfce7':'#fee2e2',color:emp.active?'#16a34a':'#dc2626' }}>
                          {emp.active ? 'Active' : 'Inactive'}
                        </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Bottom row — charts */}
            <div className="bottom-row">

                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Leave Requests Trend</h3>
                        <span className="chart-pill">This Month</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={trendData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                            <defs>
                                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                            <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                            <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:12 }}/>
                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad)" dot={{ r:3, fill:'#6366f1' }} activeDot={{ r:5 }}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Employees by Department</h3>
                    </div>
                    {deptData.length === 0 ? (
                        <div className="empty-center" style={{ height:160 }}><p>No data yet</p></div>
                    ) : (
                        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                            <div style={{ width:130, height:130, flexShrink:0 }}>
                                <PieChart width={130} height={130}>
                                    <Pie data={deptData} cx={60} cy={60} innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value">
                                        {deptData.map((_,i) => <Cell key={i} fill={DEPT_COLORS[i%DEPT_COLORS.length]}/>)}
                                    </Pie>
                                    <text x={65} y={55} textAnchor="middle" fontSize={16} fontWeight="700" fill="#0f172a">{deptTotal}</text>
                                    <text x={65} y={70} textAnchor="middle" fontSize={9} fill="#94a3b8">Total</text>
                                </PieChart>
                            </div>
                            <div className="dept-legend">
                                {deptData.slice(0,5).map((d,i) => (
                                    <div key={i} className="dept-legend-row">
                                        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                                            <div className="dept-dot" style={{ background:d.color }}/>
                                            <span className="dept-name">{d.name}</span>
                                        </div>
                                        <span className="dept-count">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3 className="dash-card-title">Recent Activity</h3>
                        <Link to="/admin/pending" className="dash-card-link" style={{ fontSize:12 }}>View all →</Link>
                    </div>
                    {recentActivity.length === 0 ? (
                        <div className="empty-center"><p>No recent activity</p></div>
                    ) : (
                        <div className="activity-list">
                            {recentActivity.map((a,i) => (
                                <div key={i} className="activity-item">
                                    <div className="activity-icon" style={{ background:a.type==='ANNUAL'?'#fef3c7':a.type==='SICK'?'#fee2e2':'#eef2ff' }}>
                                        {a.type==='ANNUAL'?'📅':a.type==='SICK'?'🏥':'📋'}
                                    </div>
                                    <div>
                                        <p className="activity-text">{a.text}</p>
                                        <p className="activity-time">{a.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;