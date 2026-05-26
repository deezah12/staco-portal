import React, { useEffect, useState } from 'react';
import { getMyBalance } from '../../api/leaveApi';
import { LeaveBalance } from '../../types';

const BalancePage: React.FC = () => {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBalance().then(r => setBalance(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!balance) return <div className="loading">Balance not found</div>;

  const standard = [
    { label: '🏖️ Annual Leave',   rem: balance.annualRemaining,   used: balance.annualUsed,   total: balance.annualTotal },
    { label: '🤒 Sick Leave',     rem: balance.sickRemaining,     used: balance.sickUsed,     total: balance.sickTotal },
    { label: '🗓️ Casual Leave',   rem: balance.casualRemaining,   used: balance.casualUsed,   total: balance.casualTotal },
    { label: '📚 Exam Leave',     rem: balance.examRemaining,     used: balance.examUsed,     total: balance.examTotal },
    { label: '🤱 Maternity Leave',rem: balance.maternityRemaining,used: balance.maternityUsed,total: balance.maternityTotal },
  ];

  const others = [
    { label: '👶 Paternity Leave', rem: balance.paternityRemaining, used: balance.paternityUsed, total: balance.paternityTotal },
  ];

  const BalanceCard = ({ label, rem, used, total }: { label: string; rem: number; used: number; total: number }) => (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>{rem}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Remaining</div>
        </div>
        <div style={{ width: 1, background: '#e2e8f0' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{used}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Used</div>
        </div>
        <div style={{ width: 1, background: '#e2e8f0' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#4f9cff' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
        </div>
      </div>
      <div className="progress-bar" style={{ height: 8 }}>
        <div className="progress-bar-fill" style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }} />
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, textAlign: 'right' }}>
        {total > 0 ? Math.round((used / total) * 100) : 0}% used
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Leave Balance</h1>
        <p>Your current leave entitlements for the year</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {standard.map(b => <BalanceCard key={b.label} {...b} />)}
      </div>

      {/* Others section — Paternity */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#374151' }}>Others</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {others.map(b => <BalanceCard key={b.label} {...b} />)}
        </div>
      </div>

      {/* Unpaid */}
      {balance.unpaidUsed > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>💸 Unpaid Leave Taken</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>
            {balance.unpaidUsed} <span style={{ fontSize: 14, color: '#64748b' }}>days</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalancePage;
