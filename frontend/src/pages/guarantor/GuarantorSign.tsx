import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { respondAsGuarantor } from '../../api/loanApi';

const GuarantorSign: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'signed' | 'declined' | null>(null);

  const handle = async (accept: boolean) => {
    if (!token) { toast.error('Invalid link'); return; }
    setLoading(true);
    try {
      await respondAsGuarantor(Number(token), accept, comment);
      setDone(accept ? 'signed' : 'declined');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{done === 'signed' ? '✅' : '❌'}</div>
          <h1 style={{ marginBottom: 8 }}>{done === 'signed' ? 'Guarantee Signed' : 'Request Declined'}</h1>
          <p style={{ color: '#64748b' }}>
            {done === 'signed'
              ? 'Thank you. The loan application will now proceed to manager review.'
              : 'You have declined. The employee has been notified and their application will be cancelled.'}
          </p>
          <div style={{ marginTop: 24, fontSize: 13, color: '#94a3b8' }}>You can close this tab.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <h2>Statco <span>HR</span></h2>
        </div>
        <h1>Guarantor Request</h1>
        <p style={{ marginBottom: 24 }}>
          You have been selected as a guarantor for a loan application. By signing, you agree to be responsible if the employee defaults on repayment.
        </p>

        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 13 }}>
          ⚠️ <strong>Important:</strong> As a guarantor, you are legally responsible for the outstanding balance if the borrower fails to repay.
        </div>

        <div className="form-group">
          <label>Comment (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Add any comments or conditions..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handle(true)} disabled={loading}>
            ✅ I Agree to Guarantee
          </button>
          <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handle(false)} disabled={loading}>
            ❌ Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuarantorSign;
