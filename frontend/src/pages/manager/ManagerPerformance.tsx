import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getManagerReviews, submitAppraisal, giveRecommendation, getReviewScores, getTrainingTypes } from '../../api/performanceApi';
import { PerformanceReview, CompetencyScore, Competency, Recommendation, TrainingType, COMPETENCY_LABELS, RECOMMENDATION_META, STATUS_META } from '../../types/performance';

const ALL_COMPETENCIES: Competency[] = ['COMMUNICATION','TEAMWORK','PRODUCTIVITY','PROBLEM_SOLVING','LEADERSHIP','ATTITUDE','INNOVATION','TIME_MANAGEMENT'];

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readonly?: boolean }> = ({ value, onChange, readonly }) => (
  <div style={{ display:'flex', gap:4 }}>
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" onClick={() => !readonly && onChange && onChange(n)}
        style={{ background:'none', border:'none', cursor: readonly ? 'default' : 'pointer',
          fontSize:24, color: n <= value ? '#f59e0b' : '#e2e8f0', padding:'0 2px' }}>★</button>
    ))}
    {value > 0 && <span style={{ marginLeft:6, fontSize:13, color:'#64748b', alignSelf:'center' }}>
      {['','Poor','Fair','Good','Very Good','Excellent'][value]}
    </span>}
  </div>
);

const ScoreBreakdown: React.FC<{ review: PerformanceReview }> = ({ review }) => (
  <div style={{ background:'#f8fafc', borderRadius:8, padding:12, marginTop:8 }}>
    <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:13 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span>Manager Score</span><span style={{ fontWeight:700 }}>{review.managerScore?.toFixed(1)} / 5.0</span>
      </div>
      {review.disciplinaryDeductions !== 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', color:'#ef4444' }}>
          <span>Disciplinary Deductions</span><span style={{ fontWeight:700 }}>{review.disciplinaryDeductions?.toFixed(1)}</span>
        </div>
      )}
      <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:4, display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:14 }}>
        <span>Final Score</span>
        <span style={{ color:(review.finalScore||0) >= 3 ? '#16a34a' : '#ef4444' }}>{review.finalScore?.toFixed(1)} / 5.0</span>
      </div>
    </div>
  </div>
);

const ManagerPerformance: React.FC = () => {
  const [reviews, setReviews]             = useState<PerformanceReview[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [loading, setLoading]             = useState(true);
  const [appraising, setAppraising]       = useState<PerformanceReview | null>(null);
  const [recommending, setRecommending]   = useState<PerformanceReview | null>(null);
  const [viewingScores, setViewingScores] = useState<{ review: PerformanceReview; scores: CompetencyScore[] } | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [scores, setScores]               = useState<Record<Competency, { score: number; comment: string }>>(() =>
    Object.fromEntries(ALL_COMPETENCIES.map(c => [c, { score:0, comment:'' }])) as any);
  const [appraisalSummary, setAppraisalSummary] = useState('');
  const [recForm, setRecForm]             = useState<{ recommendation: Recommendation | ''; trainingTypeId?: number; note: string }>({ recommendation:'', note:'' });

  useEffect(() => {
    Promise.all([getManagerReviews(), getTrainingTypes()])
      .then(([r, t]) => { setReviews(r.data); setTrainingTypes(t.data); })
      .finally(() => setLoading(false));
  }, []);

  const openAppraisal = (r: PerformanceReview) => {
    setScores(Object.fromEntries(ALL_COMPETENCIES.map(c => [c, { score:0, comment:'' }])) as any);
    setAppraisalSummary(''); setAppraising(r);
  };

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appraising) return;
    if (ALL_COMPETENCIES.some(c => scores[c].score === 0)) { toast.error('Please rate all competencies'); return; }
    if (!appraisalSummary.trim()) { toast.error('Please add a summary'); return; }
    setSubmitting(true);
    try {
      const res = await submitAppraisal(appraising.id, { scores: ALL_COMPETENCIES.map(c => ({ competency:c, score:scores[c].score, comment:scores[c].comment })), appraisalSummary });
      setReviews(prev => prev.map(r => r.id === appraising.id ? res.data : r));
      toast.success('Appraisal submitted!'); setAppraising(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommending || !recForm.recommendation) return;
    if (recForm.recommendation === 'TRAINING_AND_DEVELOPMENT' && !recForm.trainingTypeId) {
      toast.error('Please select a training type'); return;
    }
    setSubmitting(true);
    try {
      const res = await giveRecommendation(recommending.id, { recommendation: recForm.recommendation as Recommendation, trainingTypeId: recForm.trainingTypeId, note: recForm.note });
      setReviews(prev => prev.map(r => r.id === recommending.id ? res.data : r));
      toast.success('Recommendation submitted!'); setRecommending(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const avgScore = Object.values(scores).filter(s => s.score > 0).reduce((acc, s, _, arr) => acc + s.score / arr.length, 0);

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  const pending    = reviews.filter(r => r.status === 'ELIGIBLE');
  const awaitingRec = reviews.filter(r => r.status === 'ACKNOWLEDGED' || r.status === 'DISPUTED');
  const done       = reviews.filter(r => !['ELIGIBLE','ACKNOWLEDGED','DISPUTED'].includes(r.status));

  return (
    <div>
      <div className="page-header"><h1>Performance Reviews</h1><p>Appraise your staff and provide recommendations</p></div>

      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:24 }}>
        <div className="stat-card"><span className="stat-icon">⏳</span><div className="stat-label">Pending Appraisal</div><div className="stat-value" style={{ color:'#d97706' }}>{pending.length}</div></div>
        <div className="stat-card"><span className="stat-icon">💬</span><div className="stat-label">Awaiting Recommendation</div><div className="stat-value" style={{ color:'#7c3aed' }}>{awaitingRec.length}</div></div>
        <div className="stat-card"><span className="stat-icon">✅</span><div className="stat-label">Completed</div><div className="stat-value" style={{ color:'#16a34a' }}>{done.length}</div></div>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>⏳ Pending Appraisal</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pending.map(r => (
              <div key={r.id} className="card" style={{ padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{r.employee.fullName}</div>
                    <div style={{ fontSize:13, color:'#64748b' }}>{r.employee.department} · {r.employee.position} · {r.reviewPeriod}</div>
                    {(r.disciplinaryDeductions || 0) !== 0 && (
                      <div style={{ fontSize:12, color:'#ef4444', marginTop:4 }}>
                        ⚠️ Disciplinary deductions of {r.disciplinaryDeductions} will apply to final score
                      </div>
                    )}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openAppraisal(r)}>✏️ Start Appraisal</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {awaitingRec.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>💬 Awaiting Recommendation</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {awaitingRec.map(r => {
              const sm = STATUS_META[r.status];
              return (
                <div key={r.id} className="card" style={{ padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700 }}>{r.employee.fullName}</span>
                        <span style={{ background:sm.bg, color:sm.color, padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{sm.label}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#64748b' }}>{r.reviewPeriod}</div>
                      <ScoreBreakdown review={r} />
                      {r.employeeComment && (
                        <div style={{ marginTop:8, fontSize:13, background: r.status === 'DISPUTED' ? '#fef2f2' : '#f0fdf4', color: r.status === 'DISPUTED' ? '#dc2626' : '#16a34a', padding:'6px 12px', borderRadius:6 }}>
                          {r.status === 'DISPUTED' ? '⚠️' : '✅'} "{r.employeeComment}"
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-outline btn-sm" onClick={async () => { const res = await getReviewScores(r.id); setViewingScores({ review:r, scores:res.data }); }}>View Scores</button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setRecForm({ recommendation:'', note:'' }); setRecommending(r); }}>🏅 Recommend</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>✅ Completed</h3>
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Employee</th><th>Period</th><th>Final Score</th><th>Response</th><th>Recommendation</th><th></th></tr></thead>
                <tbody>
                  {done.map(r => (
                    <tr key={r.id}>
                      <td><div style={{ fontWeight:600 }}>{r.employee.fullName}</div><div style={{ fontSize:12, color:'#94a3b8' }}>{r.employee.department}</div></td>
                      <td>{r.reviewPeriod}</td>
                      <td><span style={{ fontWeight:700, color: (r.finalScore||0) >= 3 ? '#16a34a' : '#ef4444' }}>⭐ {r.finalScore}/5</span></td>
                      <td>{r.employeeResponse && <span style={{ background: r.employeeResponse === 'ACCEPTED' ? '#dcfce7' : '#fee2e2', color: r.employeeResponse === 'ACCEPTED' ? '#16a34a' : '#dc2626', padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{r.employeeResponse}</span>}</td>
                      <td>{r.recommendation && <span style={{ background:RECOMMENDATION_META[r.recommendation].bg, color:RECOMMENDATION_META[r.recommendation].color, padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{RECOMMENDATION_META[r.recommendation].icon} {RECOMMENDATION_META[r.recommendation].label}</span>}</td>
                      <td><button className="btn btn-outline btn-sm" onClick={async () => { const res = await getReviewScores(r.id); setViewingScores({ review:r, scores:res.data }); }}>Scores</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Appraisal modal */}
      {appraising && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="modal-header">
              <h2>Appraise — {appraising.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setAppraising(null)}>✕</button>
            </div>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{appraising.employee.department} · {appraising.reviewPeriod}</div>
            {(appraising.disciplinaryDeductions || 0) !== 0 && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:12, marginBottom:16, fontSize:13, color:'#dc2626' }}>
                ⚠️ This employee has disciplinary deductions of <strong>{appraising.disciplinaryDeductions}</strong> for this period. These will be subtracted from your score.
              </div>
            )}
            {avgScore > 0 && (
              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#16a34a' }}>{avgScore.toFixed(1)} <span style={{ fontSize:13, color:'#64748b', fontWeight:400 }}>/ 5.0 current avg</span></div>
                {(appraising.disciplinaryDeductions || 0) !== 0 && (
                  <div style={{ fontSize:13, color:'#ef4444', marginTop:4 }}>
                    Projected final: {Math.max(0, avgScore + (appraising.disciplinaryDeductions || 0)).toFixed(1)} after deductions
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleSubmitAppraisal}>
              {ALL_COMPETENCIES.map(c => (
                <div key={c} style={{ marginBottom:20, paddingBottom:20, borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:8 }}>{COMPETENCY_LABELS[c]}</div>
                  <StarRating value={scores[c].score} onChange={v => setScores(prev => ({ ...prev, [c]:{ ...prev[c], score:v } }))} />
                  <input style={{ marginTop:8, width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:13 }}
                    placeholder="Optional comment..." value={scores[c].comment}
                    onChange={e => setScores(prev => ({ ...prev, [c]:{ ...prev[c], comment:e.target.value } }))} />
                </div>
              ))}
              <div className="form-group">
                <label>Overall Summary</label>
                <textarea value={appraisalSummary} onChange={e => setAppraisalSummary(e.target.value)} rows={4} required style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : '📤 Submit Appraisal'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setAppraising(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recommendation modal */}
      {recommending && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <h2>Recommendation — {recommending.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setRecommending(null)}>✕</button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginBottom:16, fontSize:13 }}>
              <div><strong>Period:</strong> {recommending.reviewPeriod}</div>
              <ScoreBreakdown review={recommending} />
              <div style={{ marginTop:8 }}><strong>Response:</strong> {recommending.employeeResponse}</div>
              {recommending.employeeComment && <div style={{ marginTop:4, color: recommending.status === 'DISPUTED' ? '#dc2626' : '#16a34a' }}>"{recommending.employeeComment}"</div>}
            </div>
            <form onSubmit={handleRecommendation}>
              <div className="form-group">
                <label>Recommendation</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:4 }}>
                  {(Object.keys(RECOMMENDATION_META) as Recommendation[]).map(rec => {
                    const m = RECOMMENDATION_META[rec];
                    const selected = recForm.recommendation === rec;
                    return (
                      <button key={rec} type="button" onClick={() => setRecForm(f => ({ ...f, recommendation:rec, trainingTypeId: undefined }))}
                        style={{ padding:'12px 16px', borderRadius:10, border:`2px solid ${selected ? m.color : '#e2e8f0'}`, background: selected ? m.bg : '#fff', cursor:'pointer', textAlign:'left' }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{m.icon}</div>
                        <div style={{ fontSize:12, fontWeight:700, color: selected ? m.color : '#374151' }}>{m.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Training type selector — only shown when TRAINING_AND_DEVELOPMENT selected */}
              {recForm.recommendation === 'TRAINING_AND_DEVELOPMENT' && (
                <div className="form-group">
                  <label>Training Type <span style={{ color:'#ef4444' }}>*</span></label>
                  <select value={recForm.trainingTypeId || ''} onChange={e => setRecForm(f => ({ ...f, trainingTypeId: parseInt(e.target.value) }))} required>
                    <option value="">Select training type...</option>
                    {trainingTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Note <span style={{ color:'#ef4444' }}>*</span></label>
                <textarea value={recForm.note} onChange={e => setRecForm(f => ({ ...f, note:e.target.value }))} rows={4} required style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting || !recForm.recommendation}>{submitting ? 'Submitting...' : '🏅 Submit'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setRecommending(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingScores && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <h2>Scores — {viewingScores.review.employee.fullName}</h2>
              <button className="modal-close" onClick={() => setViewingScores(null)}>✕</button>
            </div>
            <ScoreBreakdown review={viewingScores.review} />
            <div style={{ marginTop:16 }}>
              {viewingScores.scores.map(s => (
                <div key={s.id} style={{ marginBottom:14, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{COMPETENCY_LABELS[s.competency]}</span>
                    <StarRating value={s.score} readonly />
                  </div>
                  {s.comment && <div style={{ fontSize:12, color:'#64748b' }}>{s.comment}</div>}
                </div>
              ))}
            </div>
            {viewingScores.review.appraisalSummary && (
              <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginTop:8 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Summary</div>
                <div style={{ fontSize:13, color:'#475569' }}>{viewingScores.review.appraisalSummary}</div>
              </div>
            )}
            <div style={{ marginTop:16 }}><button className="btn btn-outline" onClick={() => setViewingScores(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPerformance;
