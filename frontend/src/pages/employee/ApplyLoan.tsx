import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { applyLoan, getEligibleGuarantors, getMyLoans } from '../../api/loanApi';
import { useAuth } from '../../context/AuthContext';
import { REPAYMENT_DURATIONS } from '../../types/loan';

const ApplyLoan: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eligibleGuarantors, setEligibleGuarantors] = useState<any[]>([]);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [form, setForm] = useState({
    amount: '', monthlySalary: '', repaymentMonths: '12',
    reason: '', purpose: 'PERSONAL',
    guarantor1Id: '', guarantor2Id: '',
  });

  useEffect(() => {
    Promise.all([getEligibleGuarantors(), getMyLoans()])
      .then(([g, loans]) => {
        setEligibleGuarantors(g.data);
        const active = loans.data.some((l: any) =>
          !['FULLY_REPAID', 'REJECTED', 'CANCELLED'].includes(l.status));
        setHasActiveLoan(active);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const amount   = parseFloat(form.amount) || 0;
  const salary   = parseFloat(form.monthlySalary) || 0;
  const months   = parseInt(form.repaymentMonths) || 12;
  const monthly  = amount > 0 && months > 0 ? amount / months : 0;
  const maxMonthly = salary * 0.33;
  const isOverLimit = monthly > maxMonthly && salary > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverLimit) { toast.error('Monthly deduction exceeds 33% of salary'); return; }
    if (form.guarantor1Id === form.guarantor2Id) { toast.error('Guarantors must be different people'); return; }
    setLoading(true);
    try {
      await applyLoan({
        amount, monthlySalary: salary, repaymentMonths: months,
        reason: form.reason, purpose: form.purpose,
        guarantor1Id: parseInt(form.guarantor1Id),
        guarantor2Id: parseInt(form.guarantor2Id),
      });
      toast.success('Loan application submitted! Guarantors have been notified.');
      navigate('/employee/loans');
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(typeof d === 'string' ? d : d?.error || 'Failed to submit loan application');
    } finally { setLoading(false); }
  };

  if (initialLoading) return <div className="loading"><div className="spinner"/></div>;

  if (hasActiveLoan) return (
    <div>
      <div className="page-header"><h1>Apply for Loan</h1></div>
      <div className="card" style={{ maxWidth: 560, borderLeft: '4px solid #ef4444' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>You have an active loan</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
          You cannot apply for a new loan while you have an existing loan that is not fully repaid, rejected, or cancelled.
          Please complete your current loan repayment first.
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/employee/loans')}>View My Loans</button>
      </div>
    </div>
  );

  const g2Options = eligibleGuarantors.filter(e => e.id !== parseInt(form.guarantor1Id || '0'));
  const selectedG1 = eligibleGuarantors.find(e => e.id === parseInt(form.guarantor1Id || '0'));
  const selectedG2 = eligibleGuarantors.find(e => e.id === parseInt(form.guarantor2Id || '0'));
  const gradesConfigured = eligibleGuarantors.some(e => e.grade != null);

  return (
    <div>
      <div className="page-header">
        <h1>Apply for Loan</h1>
        <p>Requires 2 guarantors — approval flows through Unit Head → Div Head → MD → HR → Accounts</p>
      </div>

      {/* Flow steps */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {['1. Submit', '2. Guarantors Sign', '3. Unit Head', '4. Div Head', '5. MD Approval', '6. HR Processes', '7. Accounts Disburses'].map((s, i) => (
          <div key={i} style={{ background: i === 0 ? '#4f9cff' : '#f1f5f9',
            color: i === 0 ? '#fff' : '#64748b', padding: '5px 12px',
            borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s}</div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Loan Amount (₦)</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                required min="1000" placeholder="e.g. 500,000" />
            </div>
            <div className="form-group">
              <label>Monthly Salary (₦)</label>
              <input type="number" name="monthlySalary" value={form.monthlySalary} onChange={handleChange}
                required min="1" placeholder="e.g. 300,000" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Repayment Period</label>
              <select name="repaymentMonths" value={form.repaymentMonths} onChange={handleChange}>
                {REPAYMENT_DURATIONS.map(m => (
                  <option key={m} value={m}>{m} months</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Purpose</label>
              <select name="purpose" value={form.purpose} onChange={handleChange}>
                {['PERSONAL','MEDICAL','EDUCATION','HOUSING','BUSINESS','OTHER'].map(p => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loan summary */}
          {amount > 0 && salary > 0 && (
            <div style={{ background: isOverLimit ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${isOverLimit ? '#fca5a5' : '#86efac'}`,
              borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>₦{monthly.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>MONTHLY DEDUCTION</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>₦{maxMonthly.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>MAX (33% OF SALARY)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#4f9cff' }}>{months} months</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>DURATION</div>
                </div>
              </div>
              {isOverLimit && (
                <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                  ⚠️ Monthly deduction exceeds 33% of salary. Increase months or reduce amount.
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Reason for Loan</label>
            <textarea name="reason" value={form.reason} onChange={handleChange}
              required rows={3} placeholder="Explain why you need this loan..."
              style={{ resize: 'vertical' }} />
          </div>

          {/* Guarantors */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>👥 Select 2 Guarantors</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              {gradesConfigured
                ? <>Only employees with a <strong>higher grade</strong> than yours are shown.</>
                : <>Select any 2 active employees as guarantors.</>
              } Both must approve in-app before your application proceeds.
            </div>
            {eligibleGuarantors.length === 0 ? (
              <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
                ⚠️ No active employees available to act as guarantors. Please contact HR.
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Guarantor 1</label>
                  <select name="guarantor1Id" value={form.guarantor1Id} onChange={handleChange} required>
                    <option value="">Select employee...</option>
                    {eligibleGuarantors.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}{e.grade ? ` — ${e.grade.name}` : ''} ({e.department || 'No dept'})
                      </option>
                    ))}
                  </select>
                  {selectedG1 && !selectedG1.grade && gradesConfigured && (
                    <div style={{ fontSize: 12, color: '#d97706', marginTop: 4 }}>⚠️ {selectedG1.fullName} has no grade assigned — HR must assign a grade before they can guarantee this loan.</div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Guarantor 2</label>
                  <select name="guarantor2Id" value={form.guarantor2Id} onChange={handleChange} required>
                    <option value="">Select employee...</option>
                    {g2Options.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}{e.grade ? ` — ${e.grade.name}` : ''} ({e.department || 'No dept'})
                      </option>
                    ))}
                  </select>
                  {selectedG2 && !selectedG2.grade && gradesConfigured && (
                    <div style={{ fontSize: 12, color: '#d97706', marginTop: 4 }}>⚠️ {selectedG2.fullName} has no grade assigned — HR must assign a grade before they can guarantee this loan.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary"
              disabled={loading || isOverLimit || eligibleGuarantors.length === 0}>
              {loading ? 'Submitting...' : '💰 Submit Loan Application'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLoan;
