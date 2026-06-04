import React, { useEffect, useState } from 'react';
import { getPendingPayments, getPaymentHistory } from '../../api/leaveApi';
import { getPendingDisbursements, getDisbursementHistory } from '../../api/loanApi';
import { LeavePaymentRequest } from '../../types';
import { LoanRequest } from '../../types/loan';

const AccountsDashboard: React.FC = () => {
  const [pendingPayments, setPendingPayments] = useState<LeavePaymentRequest[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<LeavePaymentRequest[]>([]);
  const [pendingLoans, setPendingLoans] = useState<LoanRequest[]>([]);
  const [loanHistory, setLoanHistory] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPendingPayments(),
      getPaymentHistory(),
      getPendingDisbursements(),
      getDisbursementHistory()
    ])
      .then(([payments, paid, loans, disbursed]) => {
        setPendingPayments(payments.data);
        setPaymentHistory(paid.data);
        setPendingLoans(loans.data);
        setLoanHistory(disbursed.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const totalPendingPayments = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPendingLoans = pendingLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Accounts Dashboard</h1>
        <p>Payment and disbursement queues assigned to Accounts</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pendingPayments.length}</div>
          <div className="stat-label">Pending EOP Payments</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>₦{totalPendingPayments.toLocaleString('en-NG')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendingLoans.length}</div>
          <div className="stat-label">Pending Loan Disbursements</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>₦{totalPendingLoans.toLocaleString('en-NG')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{paymentHistory.length}</div>
          <div className="stat-label">Processed EOPs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loanHistory.length}</div>
          <div className="stat-label">Disbursed Loans</div>
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
