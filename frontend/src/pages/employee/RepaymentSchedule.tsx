import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoanById, getRepaymentSchedule } from '../../api/loanApi';
import { LoanRequest, LoanRepayment } from '../../types/loan';
import { format } from 'date-fns';

const RepaymentSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<LoanRequest | null>(null);
  const [schedule, setSchedule] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLoanById(Number(id)), getRepaymentSchedule(Number(id))])
      .then(([l, s]) => { setLoan(l.data); setSchedule(s.data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!loan) return <div className="loading">Loan not found</div>;

  const paid = schedule.filter(r => r.status === 'PAID').length;

  return (
    <div>
      <div className="page-header">
        <h1>Repayment Schedule</h1>
        <p>Loan #{loan.id} — ₦{Number(loan.amount).toLocaleString('en-NG')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Loan</div>
          <div className="stat-value" style={{ fontSize: 22 }}>₦{Number(loan.amount).toLocaleString('en-NG')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ fontSize: 22, color: '#ef4444' }}>₦{Number(loan.outstandingBalance).toLocaleString('en-NG')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Progress</div>
          <div className="stat-value" style={{ fontSize: 22, color: '#22c55e' }}>{paid}/{loan.repaymentMonths}</div>
        </div>
      </div>

      <div className="card">
        <div className="progress-bar" style={{ height: 10, marginBottom: 24 }}>
          <div className="progress-bar-fill" style={{ width: `${(paid / loan.repaymentMonths) * 100}%` }} />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>#</th><th>Due Date</th><th>Amount</th><th>Paid Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {schedule.map(r => (
                <tr key={r.id}>
                  <td style={{ color: '#94a3b8' }}>{r.installmentNumber}</td>
                  <td>{format(new Date(r.dueDate), 'dd MMM yyyy')}</td>
                  <td style={{ fontWeight: 600 }}>₦{Number(r.amount).toLocaleString('en-NG')}</td>
                  <td>{r.paidDate ? format(new Date(r.paidDate), 'dd MMM yyyy') : '—'}</td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: r.status === 'PAID' ? '#dcfce7' : r.status === 'OVERDUE' ? '#fee2e2' : '#fef3c7',
                      color: r.status === 'PAID' ? '#16a34a' : r.status === 'OVERDUE' ? '#dc2626' : '#d97706',
                    }}>
                      {r.status === 'PAID' ? '✅ Paid' : r.status === 'OVERDUE' ? '⚠️ Overdue' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    </div>
  );
};

export default RepaymentSchedule;
