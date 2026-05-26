import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding:'10px 20px 4px', fontSize:10, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>
    {children}
  </div>
);

const Sidebar: React.FC = () => {
  const { user, logout, isAdmin, isAccount, isApprover, approvalLevel } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const isMd = approvalLevel === 'MD';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">Statco <span>HR</span></div>

      <NavLink to="/profile" style={{ textDecoration:'none' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', transition:'background 0.15s' }}
             onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,156,255,0.1)')}
             onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:`hsl(${((user?.userId||1)*47)%360},60%,65%)`,
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, color:'#fff', flexShrink:0 }}>
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>{user?.fullName}</div>
              <div style={{ color:'#94a3b8', fontSize:12 }}>
                {isAdmin ? 'HR / Admin' : isAccount ? 'Accounts' : isMd ? 'MD' : isApprover ? approvalLevel.replace('_',' ') : 'Employee'} · Edit Profile
              </div>
            </div>
          </div>
        </div>
      </NavLink>

      <nav>
        {/* HR / ADMIN */}
        {isAdmin && (<>
          <NavLink to="/admin/dashboard">📊 Dashboard</NavLink>
          <SectionLabel>Staff</SectionLabel>
          <NavLink to="/admin/staff">👥 Staff Management</NavLink>
          <SectionLabel>Leave</SectionLabel>
          <NavLink to="/admin/requests">📋 All Leave Requests</NavLink>
          <NavLink to="/admin/leave-process">⚙️ Process Leave</NavLink>
          <SectionLabel>Loans</SectionLabel>
          <NavLink to="/admin/loans">💰 Loan Management</NavLink>
          <SectionLabel>Performance</SectionLabel>
          <NavLink to="/admin/performance">📈 Performance Overview</NavLink>
          <NavLink to="/manager/performance">👔 Manager Appraisals</NavLink>
          <SectionLabel>Analytics</SectionLabel>
          <NavLink to="/admin/reports">📑 Reports</NavLink>
        </>)}

        {/* ACCOUNTS */}
        {isAccount && (<>
          <NavLink to="/accounts/dashboard">🏠 Dashboard</NavLink>
          <SectionLabel>Payments</SectionLabel>
          <NavLink to="/accounts/payments">📄 Leave Payments</NavLink>
          <NavLink to="/accounts/loans">💰 Loan Disbursements</NavLink>
        </>)}

        {/* MD */}
        {isMd && !isAdmin && (<>
          <NavLink to="/employee/dashboard">🏠 Dashboard</NavLink>
          <SectionLabel>Approvals</SectionLabel>
          <NavLink to="/approver/pending">⏳ Pending Approvals (Leave)</NavLink>
          <NavLink to="/approver/loans">💰 Pending Loan Approvals</NavLink>
          <SectionLabel>My Leave</SectionLabel>
          <NavLink to="/employee/apply">✏️ Apply for Leave</NavLink>
          <NavLink to="/employee/requests">📋 My Requests</NavLink>
          <NavLink to="/employee/balance">💼 Leave Balance</NavLink>
          <SectionLabel>My Loans</SectionLabel>
          <NavLink to="/employee/loans">💰 My Loans</NavLink>
          <NavLink to="/employee/loans/apply">➕ Apply for Loan</NavLink>
          <NavLink to="/employee/guarantor-requests">🤝 Guarantor Requests</NavLink>
        </>)}

        {/* APPROVER (Unit Head / Div Head) */}
        {isApprover && !isAdmin && !isMd && (<>
          <NavLink to="/employee/dashboard">🏠 Dashboard</NavLink>
          <SectionLabel>Approvals</SectionLabel>
          <NavLink to="/approver/pending">⏳ Pending Leave Approvals</NavLink>
          <NavLink to="/approver/loans">💰 Pending Loan Approvals</NavLink>
          <SectionLabel>My Leave</SectionLabel>
          <NavLink to="/employee/apply">✏️ Apply for Leave</NavLink>
          <NavLink to="/employee/requests">📋 My Requests</NavLink>
          <NavLink to="/employee/balance">💼 Leave Balance</NavLink>
          <SectionLabel>My Loans</SectionLabel>
          <NavLink to="/employee/loans">💰 My Loans</NavLink>
          <NavLink to="/employee/loans/apply">➕ Apply for Loan</NavLink>
          <NavLink to="/employee/guarantor-requests">🤝 Guarantor Requests</NavLink>
          <SectionLabel>Performance</SectionLabel>
          <NavLink to="/employee/performance">📈 My Reviews</NavLink>
        </>)}

        {/* REGULAR EMPLOYEE */}
        {!isAdmin && !isAccount && !isApprover && !isMd && (<>
          <NavLink to="/employee/dashboard">🏠 Dashboard</NavLink>
          <SectionLabel>Leave</SectionLabel>
          <NavLink to="/employee/apply">✏️ Apply for Leave</NavLink>
          <NavLink to="/employee/requests">📋 My Requests</NavLink>
          <NavLink to="/employee/balance">💼 Leave Balance</NavLink>
          <SectionLabel>Loans</SectionLabel>
          <NavLink to="/employee/loans">💰 My Loans</NavLink>
          <NavLink to="/employee/loans/apply">➕ Apply for Loan</NavLink>
          <NavLink to="/employee/guarantor-requests">🤝 Guarantor Requests</NavLink>
          <SectionLabel>Performance</SectionLabel>
          <NavLink to="/employee/performance">📈 My Reviews</NavLink>
        </>)}
      </nav>

      <div className="sidebar-logout">
        <button className="btn btn-outline" style={{ width:'100%' }} onClick={handleLogout}>🚪 Logout</button>
      </div>
    </div>
  );
};
export default Sidebar;
