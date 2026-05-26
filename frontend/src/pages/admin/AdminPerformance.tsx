import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  getAllReviews, markEligible, closeReview, getPerfStats,
  getPerfEmployees, getSuggestedPeriods,
  getManagerReviews, submitAppraisal, giveRecommendation, getReviewScores
} from '../../api/performanceApi';
import {
  PerformanceReview, CompetencyScore, Competency, Recommendation,
  ReviewStatus, STATUS_META, RECOMMENDATION_META, COMPETENCY_LABELS
} from '../../types/performance';

type Tab = 'overview' | 'manager';

const ALL_COMPETENCIES: Competency[] = [
  'COMMUNICATION','TEAMWORK','PRODUCTIVITY','PROBLEM_SOLVING',
  'LEADERSHIP','ATTITUDE','INNOVATION','TIME_MANAGEMENT'
];

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readonly?: boolean }> = ({ value, onChange, readonly }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
                  onClick={() => !readonly && onChange && onChange(n)}
                  style={{ background:'none', border:'none', cursor: readonly ? 'default' : 'pointer',
                    fontSize: 22, color: n <= value ? '#f59e0b' : '#e2e8f0', padding:'0 1px', transition:'color 0.15s' }}>★</button>
      ))}
      {value > 0 && <span style={{ marginLeft:4, fontSize:12, color:'#64748b', alignSelf:'center' }}>
      {['','Poor','Fair','Good','Very Good','Excellent'][value]}
    </span>}
    </div>
);

const AdminPerformance: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');

  // Overview state
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReviewStatus | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: '', managerId: '', reviewPeriod: '' });
  const [submitting, setSubmitting] = useState(false);

  // Manager appraisal state
  const [myReviews, setMyReviews] = useState<PerformanceReview[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [appraising, setAppraising] = useState<PerformanceReview | null>(null);
  const [recommending, setRecommending] = useState<PerformanceReview | null>(null);
  const [viewingScores, setViewingScores] = useState<{ review: PerformanceReview; scores: CompetencyScore[] } | null>(null);
  const [scores, setScores] = useState<Record<Competency, { score: number; comment: string }>>(() =>
      Object.fromEntries(ALL_COMPETENCIES.map(c => [c, { score: 0, comment: '' }])) as any);
  const [appraisalSummary, setAppraisalSummary] = useState('');
  const [recForm, setRecForm] = useState<{ recommendation: Recommendation | ''; note: string }>({ recommendation: '', note: '' });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getAllReviews(), getPerfStats(), getPerfEmployees(), getSuggestedPeriods()])
        .then(([r, s, e, p]) => { setReviews(r.data); setStats(s.data); setEmployees(e.data); setPeriods(p.data); })
        .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'manager' && myReviews.length === 0) {
      setMyLoading(true);
      getManagerReviews().then(r => setMyReviews(r.data)).finally(() => setMyLoading(false));
    }
  }, [tab]);

  const filtered = filter === 'ALL' ? reviews : reviews.filter(r => r.status === filter);

  const handleMarkEligible = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await markEligible({ employeeId: parseInt(form.employeeId), managerId: parseInt(form.managerId), reviewPeriod: form.reviewPeriod });
      setReviews(prev => [res.data, ...prev]);
      if (stats) setStats({ ...stats, total: stats.total + 1, eligible: stats.eligible + 1 });
      toast.success('Employee marked eligible');
      setShowModal(false);
      setForm({ employeeId: '', managerId: '', reviewPeriod: '' });
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleClose = async (id: number) => {
    if (!window.confirm('Close this review?')) return;
    try {
      const res = await closeReview(id);
      setReviews(prev => prev.map(r => r.id === id ? res.data : r));
      toast.success('Review closed');
    } catch { toast.error('Failed'); }
  };

  const openAppraisal = (r: PerformanceReview) => {
    setScores(Object.fromEntries(ALL_COMPETENCIES.map(c => [c, { score: 0, comment: '' }])) as any);
    setAppraisalSummary('');
    setAppraising(r);
  };

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appraising) return;
    if (ALL_COMPETENCIES.some(c => scores[c].score === 0)) { toast.error('Please rate all competencies'); return; }
    setActionSubmitting(true);
    try {
      const res = await submitAppraisal(appraising.id, {
        scores: ALL_COMPETENCIES.map(c => ({ competency: c, score: scores[c].score, comment: scores[c].comment })),
        appraisalSummary
      });
      setMyReviews(prev => prev.map(r => r.id === appraising.id ? res.data : r));
      // Also update overview
      setReviews(prev => prev.map(r => r.id === appraising.id ? res.data : r));
      toast.success('Appraisal submitted!');
      setAppraising(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setActionSubmitting(false); }
  };

  const handleRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommending || !recForm.recommendation) return;
    setActionSubmitting(true);
    try {
      const res = await giveRecommendation(recommending.id, { recommendation: recForm.recommendation as Recommendation, note: recForm.note });
      setMyReviews(prev => prev.map(r => r.id === recommending.id ? res.data : r));
      setReviews(prev => prev.map(r => r.id === recommending.id ? res.data : r));
      toast.success('Recommendation submitted!');
      setRecommending(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setActionSubmitting(false); }
  };

  const handleViewScores = async (r: PerformanceReview) => {
    try { const res = await getReviewScores(r.id); setViewingScores({ review: r, scores: res.data }); }
    catch { toast.error('Could not load scores'); }
  };

  const avgScore = Object.values(scores).filter(s => s.score > 0).reduce((acc, s, _, arr) => acc + s.score / arr.length, 0);

  const cardStyle = (active: boolean) => ({
    cursor: 'pointer', transition: 'all 0.2s',
    border: active ? '2px solid #4f9cff' : '2px solid transparent',
    boxShadow: active ? '0 4px 16px rgba(79,156,255,0.2)' : undefined,
    background: active ? '#f0f7ff' : '#fff',
  });

  const pending = myReviews.filter(r => r.status === 'ELIGIBLE');
  const awaitingRec = myReviews.filter(r => r.status === 'ACKNOWLEDGED' || r.status === 'DISPUTED');
  const done = myReviews.filter(r => !['ELIGIBLE','ACKNOWLEDGED','DISPUTED'].includes(r.status));

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  return (
      <div>
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1>Performance Reviews</h1>
            <p>{tab === 'overview' ? 'Track all appraisal activity across Statco' : 'Appraise your assigned staff'}</p>
          </div>
          {tab === 'overview' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Mark Eligible</button>
          )}
        </div>

        {/* ══ OVERVIEW ══════════════════════════════════════════ */}
        <>
          {stats && (
              <div className="stats-grid" style={{ marginBottom:24 }}>
                {[
                  { label:'Total Reviews', value:stats.total, icon:'📊', f:'ALL' as const },
                  { label:'Pending Appraisal', value:stats.eligible, icon:'⏳', f:'ELIGIBLE' as const },
                  { label:'Awaiting Employee', value:stats.awaitingEmployee, icon:'👤', f:'APPRAISED' as const },
                  { label:'Disputed', value:stats.disputed, icon:'⚠️', f:'DISPUTED' as const },
                ].map(s => (
                    <div key={s.label} className="stat-card" style={cardStyle(filter === s.f)} onClick={() => setFilter(s.f)}>
                      <span className="stat-icon">{s.icon}</span>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div style={{ fontSize:11, color:'#4f9cff', marginTop:6, fontWeight:600 }}>
                        {filter === s.f ? '▼ Viewing below' : 'Click to view →'}
                      </div>
                    </div>
                ))}
              </div>
          )}
          <div className="card">
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {(['ALL','ELIGIBLE','APPRAISED','ACKNOWLEDGED','DISPUTED','RECOMMENDATION_GIVEN','CLOSED'] as const).map(s => (
                  <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
                    {s === 'ALL' ? 'All' : STATUS_META[s as ReviewStatus]?.label || s}
                  </button>
              ))}
            </div>
            {filtered.length === 0 ? (
                <div className="empty-state"><div className="icon">📊</div><p>No reviews found</p></div>
            ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {filtered.map(r => {
                    const sm = STATUS_META[r.status];
                    return (
                        <div key={r.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:16 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                                <span style={{ fontWeight:700, fontSize:15 }}>{r.employee.fullName}</span>
                                <span style={{ fontSize:13, color:'#64748b' }}>{r.employee.department} · {r.employee.position}</span>
                                <span style={{ background:sm.bg, color:sm.color, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{sm.label}</span>
                              </div>
                              <div style={{ display:'flex', gap:16, fontSize:13, color:'#64748b', flexWrap:'wrap' }}>
                                <span>📅 <strong>{r.reviewPeriod}</strong></span>
                                <span>👔 {r.manager.fullName}</span>
                                {r.finalScore && <span>⭐ <strong>{r.finalScore}/5.0</strong></span>}
                                {r.recommendation && (
                                    <span style={{ background:RECOMMENDATION_META[r.recommendation].bg, color:RECOMMENDATION_META[r.recommendation].color, padding:'1px 8px', borderRadius:20, fontWeight:600 }}>
                                {RECOMMENDATION_META[r.recommendation].icon} {RECOMMENDATION_META[r.recommendation].label}
                              </span>
                                )}
                              </div>
                              {r.employeeResponse === 'REJECTED' && r.employeeComment && (
                                  <div style={{ marginTop:8, fontSize:13, color:'#dc2626', background:'#fef2f2', padding:'6px 12px', borderRadius:6 }}>
                                    ⚠️ Disputed: {r.employeeComment}
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
          </div>
        </>

        {/* Manager appraisal content is at /manager/performance */}
        {false && (
            <>
              {myLoading ? (
                  <div className="loading"><div className="spinner"/></div>
              ) : (
                  <>
                    {/* Stats row */}
                    <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:24 }}>
                      <div className="stat-card"><span className="stat-icon">⏳</span><div className="stat-label">Pending Appraisal</div><div className="stat-value" style={{ color:'#d97706' }}>{pending.length}</div></div>
                      <div className="stat-card"><span className="stat-icon">💬</span><div className="stat-label">Awaiting Recommendation</div><div className="stat-value" style={{ color:'#7c3aed' }}>{awaitingRec.length}</div></div>
                      <div className="stat-card"><span className="stat-icon">✅</span><div className="stat-label">Completed</div><div className="stat-value" style={{ color:'#16a34a' }}>{done.length}</div></div>
                    </div>

                    {myReviews.length === 0 ? (
                        <div className="card"><div className="empty-state"><div className="icon">👔</div><p>No staff assigned to you for appraisal</p></div></div>
                    ) : (
                        <>
                          {/* Pending appraisals */}
                          {pending.length > 0 && (
                              <div style={{ marginBottom:20 }}>
                                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>⏳ Pending Appraisal</h3>
                                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                  {pending.map(r => (
                                      <div key={r.id} className="card" style={{ padding:16 }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                                          <div>
                                            <div style={{ fontWeight:700 }}>{r.employee.fullName}</div>
                                            <div style={{ fontSize:13, color:'#64748b' }}>{r.employee.department} · {r.employee.position} · {r.reviewPeriod}</div>
                                          </div>
                                          <button className="btn btn-primary btn-sm" onClick={() => openAppraisal(r)}>✏️ Start Appraisal</button>
                                        </div>
                                      </div>
                                  ))}
                                </div>
                              </div>
                          )}

                          {/* Awaiting recommendation */}
                          {awaitingRec.length > 0 && (
                              <div style={{ marginBottom:20 }}>
                                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>💬 Awaiting Recommendation</h3>
                                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                  {awaitingRec.map(r => {
                                    const sm = STATUS_META[r.status];
                                    return (
                                        <div key={r.id} className="card" style={{ padding:16 }}>
                                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                                            <div>
                                              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                                                <span style={{ fontWeight:700 }}>{r.employee.fullName}</span>
                                                <span style={{ background:sm.bg, color:sm.color, padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{sm.label}</span>
                                              </div>
                                              <div style={{ fontSize:13, color:'#64748b' }}>{r.reviewPeriod} · ⭐ {r.finalScore}/5.0</div>
                                              {r.employeeComment && (
                                                  <div style={{ marginTop:8, fontSize:13, background: r.status === 'DISPUTED' ? '#fef2f2' : '#f0fdf4', color: r.status === 'DISPUTED' ? '#dc2626' : '#16a34a', padding:'6px 12px', borderRadius:6 }}>
                                                    {r.status === 'DISPUTED' ? '⚠️' : '✅'} "{r.employeeComment}"
                                                  </div>
                                              )}
                                            </div>
                                            <div style={{ display:'flex', gap:8 }}>
                                              <button className="btn btn-outline btn-sm" onClick={() => handleViewScores(r)}>View Scores</button>
                                              <button className="btn btn-primary btn-sm" onClick={() => { setRecForm({ recommendation:'', note:'' }); setRecommending(r); }}>🏅 Recommend</button>
                                            </div>
                                          </div>
                                        </div>
                                    );
                                  })}
                                </div>
                              </div>
                          )}

                          {/* Completed */}
                          {done.length > 0 && (
                              <div>
                                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>✅ Completed</h3>
                                <div className="card">
                                  <div className="table-wrapper">
                                    <table>
                                      <thead><tr><th>Employee</th><th>Period</th><th>Score</th><th>Response</th><th>Recommendation</th><th></th></tr></thead>
                                      <tbody>
                                      {done.map(r => (
                                          <tr key={r.id}>
                                            <td><div style={{ fontWeight:600 }}>{r.employee.fullName}</div><div style={{ fontSize:12, color:'#94a3b8' }}>{r.employee.department}</div></td>
                                            <td>{r.reviewPeriod}</td>
                                            <td><span style={{ fontWeight:700, color:'#f59e0b' }}>⭐ {r.finalScore}/5</span></td>
                                            <td>{r.employeeResponse && <span style={{ background: r.employeeResponse === 'ACCEPTED' ? '#dcfce7' : '#fee2e2', color: r.employeeResponse === 'ACCEPTED' ? '#16a34a' : '#dc2626', padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{r.employeeResponse}</span>}</td>
                                            <td>{r.recommendation && <span style={{ background:RECOMMENDATION_META[r.recommendation].bg, color:RECOMMENDATION_META[r.recommendation].color, padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600 }}>{RECOMMENDATION_META[r.recommendation].icon} {RECOMMENDATION_META[r.recommendation].label}</span>}</td>
                                            <td><button className="btn btn-outline btn-sm" onClick={() => handleViewScores(r)}>Scores</button></td>
                                          </tr>
                                      ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                          )}
                        </>
                    )}
                  </>
              )}
            </>
        )}

        {/* ══ MODALS ══════════════════════════════════════════════ */}

        {/* Mark eligible modal */}
        {showModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header"><h2>Mark Employee Eligible</h2><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                <form onSubmit={handleMarkEligible}>
                  <div className="form-group"><label>Employee</label>
                    <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId:e.target.value }))} required>
                      <option value="">Select employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.department || 'No dept'}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Assign Manager</label>
                    <select value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId:e.target.value }))} required>
                      <option value="">Select manager...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.role}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Review Period</label>
                    <select value={form.reviewPeriod} onChange={e => setForm(f => ({ ...f, reviewPeriod:e.target.value }))} required>
                      <option value="">Select period...</option>
                      {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '✅ Mark Eligible'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  </div>
                </form>
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
                {avgScore > 0 && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:28, fontWeight:800, color:'#16a34a' }}>{avgScore.toFixed(1)}</span>
                      <div><div style={{ fontWeight:700, fontSize:13 }}>Current Average</div><div style={{ fontSize:12, color:'#64748b' }}>out of 5.0</div></div>
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
                    <label>Overall Appraisal Summary</label>
                    <textarea value={appraisalSummary} onChange={e => setAppraisalSummary(e.target.value)} rows={4} placeholder="Summarise overall performance..." style={{ resize:'vertical' }} required />
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="submit" className="btn btn-primary" disabled={actionSubmitting}>{actionSubmitting ? 'Submitting...' : '📤 Submit Appraisal'}</button>
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
                <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginBottom:20, fontSize:13 }}>
                  <div><strong>Period:</strong> {recommending.reviewPeriod}</div>
                  <div><strong>Score:</strong> ⭐ {recommending.finalScore}/5.0</div>
                  <div><strong>Response:</strong> {recommending.employeeResponse}</div>
                  {recommending.employeeComment && <div style={{ marginTop:6, color: recommending.status === 'DISPUTED' ? '#dc2626' : '#16a34a' }}>"{recommending.employeeComment}"</div>}
                </div>
                <form onSubmit={handleRecommendation}>
                  <div className="form-group">
                    <label>Recommendation</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:4 }}>
                      {(Object.keys(RECOMMENDATION_META) as Recommendation[]).map(rec => {
                        const m = RECOMMENDATION_META[rec];
                        const selected = recForm.recommendation === rec;
                        return (
                            <button key={rec} type="button" onClick={() => setRecForm(f => ({ ...f, recommendation:rec }))}
                                    style={{ padding:'12px 16px', borderRadius:10, border:`2px solid ${selected ? m.color : '#e2e8f0'}`, background: selected ? m.bg : '#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                              <div style={{ fontSize:20, marginBottom:4 }}>{m.icon}</div>
                              <div style={{ fontSize:12, fontWeight:700, color: selected ? m.color : '#374151' }}>{m.label}</div>
                            </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Note</label>
                    <textarea value={recForm.note} onChange={e => setRecForm(f => ({ ...f, note:e.target.value }))} rows={4} placeholder="Explain your recommendation..." style={{ resize:'vertical' }} required />
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="submit" className="btn btn-primary" disabled={actionSubmitting || !recForm.recommendation}>{actionSubmitting ? 'Submitting...' : '🏅 Submit'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setRecommending(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* View scores modal */}
        {viewingScores && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth:560 }}>
                <div className="modal-header">
                  <h2>Scores — {viewingScores.review.employee.fullName}</h2>
                  <button className="modal-close" onClick={() => setViewingScores(null)}>✕</button>
                </div>
                <div style={{ marginBottom:16, fontSize:13, color:'#64748b' }}>
                  {viewingScores.review.reviewPeriod} · Overall: <strong>⭐ {viewingScores.review.finalScore}/5.0</strong>
                </div>
                {viewingScores.scores.map(s => (
                    <div key={s.id} style={{ marginBottom:14, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{COMPETENCY_LABELS[s.competency]}</span>
                        <StarRating value={s.score} readonly />
                      </div>
                      {s.comment && <div style={{ fontSize:12, color:'#64748b' }}>{s.comment}</div>}
                    </div>
                ))}
                {viewingScores.review.appraisalSummary && (
                    <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginTop:8 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Summary</div>
                      <div style={{ fontSize:13, color:'#475569' }}>{viewingScores.review.appraisalSummary}</div>
                    </div>
                )}
                <div style={{ marginTop:16 }}>
                  <button className="btn btn-outline" onClick={() => setViewingScores(null)}>Close</button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default AdminPerformance;