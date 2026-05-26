import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { applyLeave } from '../../api/leaveApi';
import { LeaveType, leaveTypeLabel } from '../../types';
import { differenceInCalendarDays } from 'date-fns';

const ALL_LEAVE_TYPES: LeaveType[] = ['ANNUAL','SICK','CASUAL','EXAM','MATERNITY','PATERNITY','UNPAID','OTHER'];

// Paternity shown under "Others" group in the dropdown
const LEAVE_GROUPS = [
  { label: 'Standard', types: ['ANNUAL','SICK','CASUAL','EXAM'] as LeaveType[] },
  { label: 'Family',   types: ['MATERNITY','UNPAID'] as LeaveType[] },
  { label: 'Others',   types: ['PATERNITY','OTHER'] as LeaveType[] },
];

const ApplyLeave: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [handoverFile, setHandoverFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    leaveType: 'ANNUAL' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    reliefStaffName: '',
  });

  const days = form.startDate && form.endDate
    ? differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1
    : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (days <= 0)      { toast.error('End date must be after start date'); return; }
    if (!handoverFile)  { toast.error('Please upload a handover note'); return; }

    setLoading(true);
    try {
      await applyLeave(form, handoverFile);
      toast.success('Leave request submitted!');
      navigate('/employee/requests');
    } catch (err: any) {
      const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Apply for Leave</h1>
        <p>Complete all fields and attach your handover note</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>

          {/* Leave Type */}
          <div className="form-group">
            <label>Leave Type <span style={{ color: '#ef4444' }}>*</span></label>
            <select name="leaveType" value={form.leaveType} onChange={handleChange}>
              {LEAVE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.types.map(t => (
                    <option key={t} value={t}>{leaveTypeLabel[t]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange}
                required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label>End Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange}
                required min={form.startDate} />
            </div>
          </div>

          {/* Days preview */}
          {days > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
              padding: '10px 16px', marginBottom: 20, fontSize: 14, color: '#1d4ed8' }}>
              📅 <strong>{days} day{days > 1 ? 's' : ''}</strong> requested
              {days >= 10 && form.leaveType === 'ANNUAL' && (
                <span style={{ marginLeft: 12, color: '#059669', fontWeight: 600 }}>
                  💰 Leave allowance applicable
                </span>
              )}
            </div>
          )}

          {/* Relief Staff */}
          <div className="form-group">
            <label>Relief Staff Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" name="reliefStaffName" value={form.reliefStaffName}
              onChange={handleChange} required
              placeholder="Name of colleague covering your duties" />
          </div>

          {/* Reason */}
          <div className="form-group">
            <label>Reason (optional)</label>
            <textarea name="reason" value={form.reason} onChange={handleChange}
              rows={3} placeholder="Briefly describe the reason..."
              style={{ resize: 'vertical' }} />
          </div>

          {/* Handover Note Upload */}
          <div className="form-group">
            <label>
              Handover Note <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ fontWeight: 400, fontSize: 12, color: '#64748b', marginLeft: 6 }}>
                (PDF, Word, or image — max 10MB)
              </span>
            </label>
            <div style={{ border: `2px dashed ${handoverFile ? '#22c55e' : '#cbd5e1'}`,
              borderRadius: 10, padding: '20px 16px', textAlign: 'center',
              background: handoverFile ? '#f0fdf4' : '#f8fafc', cursor: 'pointer',
              transition: 'all 0.2s' }}>
              <input type="file" id="handoverNote"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => setHandoverFile(e.target.files?.[0] || null)} />
              <label htmlFor="handoverNote" style={{ cursor: 'pointer' }}>
                {handoverFile ? (
                  <div>
                    <div style={{ fontSize: 24 }}>📎</div>
                    <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 14, marginTop: 4 }}>
                      {handoverFile.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Click to change file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28 }}>📤</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                      Click to upload handover note
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      Required before submission
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : '✉️ Submit Request'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeave;
