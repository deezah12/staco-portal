import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Employee
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ApplyLeave from './pages/employee/ApplyLeave';
import MyRequests from './pages/employee/MyRequests';
import BalancePage from './pages/employee/BalancePage';
import ApplyLoan from './pages/employee/ApplyLoan';
import MyLoans from './pages/employee/MyLoans';
import RepaymentSchedule from './pages/employee/RepaymentSchedule';
import EmployeePerformance from './pages/employee/EmployeePerformance';

// Guarantor (in-app)
import GuarantorRequests from './pages/guarantor/GuarantorRequests';

// Approver (Unit Head / Div Head / MD)
import ApproverPending from './pages/approver/ApproverPending';
import ApproverLoans from './pages/approver/ApproverLoans';

// HR / Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AllRequests from './pages/admin/AllRequests';
import HrProcessLeave from './pages/admin/HrProcessLeave';
import AdminLoans from './pages/admin/AdminLoans';
import AdminPerformance from './pages/admin/AdminPerformance';
import AdminReports from './pages/admin/Adminreports';
import StaffManagement from './pages/admin/Staffmanagement';
import ManagerPerformance from './pages/manager/ManagerPerformance';

// Accounts
import AccountsPayments from './pages/accounts/AccountsPayments';
import AccountsLoans from './pages/accounts/AccountsLoans';

// Shared
import ProfilePage from './pages/Profilepage';
import ChangePassword from './pages/Changepassword';

const ProtectedRoute = ({ children, adminOnly = false, accountOnly = false }:
  { children: React.ReactNode; adminOnly?: boolean; accountOnly?: boolean }) => {
  const { user, isAdmin, isAccount } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/employee/dashboard" replace />;
  if (accountOnly && !isAccount) return <Navigate to="/employee/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, isAdmin, isAccount } = useAuth();
  const defaultRoute = !user ? '/login'
    : user.mustChangePassword ? '/change-password'
    : isAdmin ? '/admin/dashboard'
    : isAccount ? '/accounts/payments'
    : '/employee/dashboard';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultRoute} replace /> : <LoginPage />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/profile" element={<ProfilePage />} />

        {/* Employee + Approvers */}
        <Route path="/employee/dashboard"          element={<EmployeeDashboard />} />
        <Route path="/employee/apply"              element={<ApplyLeave />} />
        <Route path="/employee/requests"           element={<MyRequests />} />
        <Route path="/employee/balance"            element={<BalancePage />} />
        <Route path="/employee/loans"              element={<MyLoans />} />
        <Route path="/employee/loans/apply"        element={<ApplyLoan />} />
        <Route path="/employee/loans/:id/schedule" element={<RepaymentSchedule />} />
        <Route path="/employee/performance"        element={<EmployeePerformance />} />
        <Route path="/employee/guarantor-requests" element={<GuarantorRequests />} />
        <Route path="/manager/performance"         element={<ManagerPerformance />} />

        {/* Approver routes */}
        <Route path="/approver/pending" element={<ApproverPending />} />
        <Route path="/approver/loans"   element={<ApproverLoans />} />
      </Route>

      {/* HR / Admin routes */}
      <Route element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>}>
        <Route path="/admin/dashboard"     element={<AdminDashboard />} />
        <Route path="/admin/requests"      element={<AllRequests />} />
        <Route path="/admin/leave-process" element={<HrProcessLeave />} />
        <Route path="/admin/loans"         element={<AdminLoans />} />
        <Route path="/admin/performance"   element={<AdminPerformance />} />
        <Route path="/admin/reports"       element={<AdminReports />} />
        <Route path="/admin/staff"         element={<StaffManagement />} />
      </Route>

      {/* Accounts routes */}
      <Route element={<ProtectedRoute accountOnly><Layout /></ProtectedRoute>}>
        <Route path="/accounts/payments" element={<AccountsPayments />} />
        <Route path="/accounts/loans"    element={<AccountsLoans />} />
      </Route>

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: 14, borderRadius: 8 } }} />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);
export default App;
