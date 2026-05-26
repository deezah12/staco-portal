import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLoans } from '../../api/loanApi';
import { LoanRequest, loanStatusMeta } from '../../types/loan';
import { format } from 'date-fns';

const MyLoans: React.FC = () => {
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLoans().then(r => setLoans(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h1>My Loans</h1><p>Track your loan applications and repayments</p></div>
        <Link to="/employee/loans/apply" className="btn btn-primary">+ Apply for Loan</Link>
      </div>

      {loans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">💰</div><p>No loan applications yet</p>
            <Link to="/employee/loans/apply" className="btn btn-primary" style={{ marginTop: 16 }}>Apply for a Loan</Link>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          {loans.map(loan => {
            const s = loanStatusMeta[loan.status];
            const paidCount = loan.repayments?.filter(r => r.status === 'PAID').length || 0;
            const progress  = loan.repaymentMonths > 0 ? (paidCount / loan.repaymentMonths) * 100 : 0;
            return (
              <div className="card" key={loan.id}
                style={{ borderLeft: loan.status === 'OVERDUE' ? '4px solid #ef4444' : undefined }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 8, flexWrap:'wrap' }}>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>
                        ₦{Number(loan.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ background: s.bg, color: s.color, padding:'3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap: 16, flexWrap:'wrap', fontSize: 13, color:'#64748b' }}>
                      <span>📅 Applied: {format(new Date(loan.createdAt), 'dd MMM yyyy')}</span>
                      <span>🗓 {loan.repaymentMonths} months</span>
                      <span>💳 ₦{Number(loan.monthlyDeduction).toLocaleString('en-NG')}/month</span>
                      {loan.purpose && <span>🎯 {loan.purpose}</span>}
                    </div>

                    {/* Guarantor status */}
                    {loan.guarantors?.length > 0 && (
                      <div style={{ marginTop: 10, display:'flex', gap: 8, flexWrap:'wrap' }}>
                        {loan.guarantors.map(g => (
                          <span key={g.id} style={{ fontSize: 12, padding:'2px 10px', borderRadius: 20, fontWeight: 600,
                            background: g.status === 'SIGNED' ? '#dcfce7' : g.status === 'DECLINED' ? '#fee2e2' : '#fef3c7',
                            color: g.status === 'SIGNED' ? '#16a34a' : g.status === 'DECLINED' ? '#dc2626' : '#d97706' }}>
                            G{g.slotNumber}: {g.guarantor.fullName} — {g.status}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Repayment progress */}
                    {(loan.status === 'DISBURSED' || loan.status === 'OVERDUE' || loan.status === 'FULLY_REPAID') && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, color:'#64748b', marginBottom: 4 }}>
                          <span>Repayment ({paidCount}/{loan.repaymentMonths} installments)</span>
                          <span style={{ color: loan.hasOverdueInstallment ? '#ef4444' : undefined }}>
                            Outstanding: ₦{Number(loan.outstandingBalance).toLocaleString('en-NG')}
                          </span>
                        </div>
                        <div className="progress-bar" style={{ height: 8 }}>
                          <div className="progress-bar-fill" style={{
                            width: `${progress}%`,
                            background: loan.status === 'OVERDUE' ? '#ef4444' : progress === 100 ? '#22c55e' : '#4f9cff'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {(loan.status === 'DISBURSED' || loan.status === 'OVERDUE' || loan.status === 'FULLY_REPAID') && (
                    <Link to={`/employee/loans/${loan.id}/schedule`} className="btn btn-outline btn-sm">View Schedule</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MyLoans;
