import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getPendingDisbursements, disburseLoan } from '../../api/loanApi';
import { LoanRequest } from '../../types/loan';
import { format } from 'date-fns';

const AccountsLoans: React.FC = () => {
  const [loans, setLoans]       = useState<LoanRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<LoanRequest | null>(null);
  const [note, setNote]         = useState('');
  const [docFile, setDocFile]   = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPendingDisbursements().then(r => setLoans(r.data)).finally(() => setLoading(false));
  }, []);

  const handleDisburse = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await disburseLoan(selected.id, note, docFile || undefined);
      setLoans(prev => prev.filter(l => l.id !== selected.id));
      toast.success('Loan disbursed successfully');
      setSelected(null); setNote(''); setDocFile(null);
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Disbursement failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Loan Disbursements</h1>
        <p>{loans.length} loan{loans.length !== 1 ? 's' : ''} pending disbursement</p>
      </div>

      {loans.length === 0
        ? <div className="card"><div className="empty-state"><div className="icon">🎉</div>No pending disbursements</div></div>
        : <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            {loans.map(loan => (
              <div className="card" key={loan.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.employee.fullName}</div>
                    <div style={{ fontSize: 13, color:'#64748b', marginTop: 2 }}>{loan.employee.department}</div>
                    <div style={{ marginTop: 10, display:'flex', gap: 16, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, color:'#94a3b8', textTransform:'uppercase', fontWeight: 600 }}>Amount</div>
                        <div style={{ fontWeight: 700, fontSize: 20, color:'#059669' }}>₦{Number(loan.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color:'#94a3b8', textTransform:'uppercase', fontWeight: 600 }}>Duration</div>
                        <div style={{ fontWeight: 600 }}>{loan.repaymentMonths} months</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color:'#94a3b8', textTransform:'uppercase', fontWeight: 600 }}>Monthly</div>
                        <div style={{ fontWeight: 600 }}>₦{Number(loan.monthlyDeduction).toLocaleString('en-NG')}</div>
                      </div>
                      {loan.disbursementDate && (
                        <div>
                          <div style={{ fontSize: 11, color:'#94a3b8', textTransform:'uppercase', fontWeight: 600 }}>Disburse By</div>
                          <div style={{ fontWeight: 600 }}>{format(new Date(loan.disbursementDate), 'dd MMM yyyy')}</div>
                        </div>
                      )}
                    </div>
                    {loan.hrComment && <div style={{ fontSize: 12, color:'#64748b', marginTop: 6 }}>HR Note: {loan.hrComment}</div>}
                  </div>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => { setSelected(loan); setNote(''); setDocFile(null); }}>
                    💸 Disburse
                  </button>
                </div>
              </div>
            ))}
          </div>
      }

      {selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Disburse Loan — {selected.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color:'#059669' }}>₦{Number(selected.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 13, color:'#64748b', marginTop: 4 }}>{selected.repaymentMonths} months · ₦{Number(selected.monthlyDeduction).toLocaleString('en-NG')}/month</div>
            </div>
            <div className="form-group">
              <label>Upload Disbursement Confirmation (optional)</label>
              <div style={{ border:`2px dashed ${docFile ? '#22c55e' : '#cbd5e1'}`, borderRadius: 10, padding: 16, textAlign:'center',
                background: docFile ? '#f0fdf4' : '#f8fafc', cursor:'pointer' }}>
                <input type="file" id="docFile" accept=".pdf,.doc,.docx" style={{ display:'none' }}
                  onChange={e => setDocFile(e.target.files?.[0] || null)} />
                <label htmlFor="docFile" style={{ cursor:'pointer' }}>
                  {docFile
                    ? <><div style={{ fontSize: 20 }}>📎</div><div style={{ fontWeight: 600, color:'#16a34a', fontSize: 13 }}>{docFile.name}</div></>
                    : <><div style={{ fontSize: 24 }}>📤</div><div style={{ fontSize: 13, marginTop: 4 }}>Click to upload</div></>
                  }
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Payment reference, bank details..." style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleDisburse} disabled={submitting}>
                {submitting ? 'Processing...' : '✅ Confirm Disbursement'}
              </button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountsLoans;
