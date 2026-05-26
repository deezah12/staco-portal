import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getMyReviews, respondToAppraisal, getReviewScores, submitFeedback, getMyTraining, getMyDisciplinary, getFeedbackQuestions } from '../../api/performanceApi';
import { PerformanceReview, CompetencyScore, TrainingRecord, DisciplinaryAction, FeedbackQuestion, COMPETENCY_LABELS, RECOMMENDATION_META, STATUS_META, TRAINING_STATUS_META } from '../../types/performance';

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#16a34a'];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:`${(score/5)*100}%`, height:'100%', background:colors[score], borderRadius:4 }} />
      </div>
      <span style={{ fontWeight:700, fontSize:14, color:colors[score], minWidth:20 }}>{score}</span>
    </div>
  );
};

const ScoreBreakdown: React.FC<{ review: PerformanceReview }> = ({ review }) => (
  <div style={{ background:'#f8fafc', borderRadius:10, padding:14, marginTop:12 }}>
    <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Score Breakdown</div>
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
        <span>Manager Score</span>
        <span style={{ fontWeight:700 }}>{review.managerScore?.toFixed(1)} / 5.0</span>
      </div>
      {review.disciplinaryDeductions !== 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ef4444' }}>
          <span>Disciplinary Deductions</span>
          <span style={{ fontWeight:700 }}>{review.disciplinaryDeductions?.toFixed(1)}</span>
        </div>
      )}
      <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:6, display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700 }}>
        <span>Final Score</span>
        <span style={{ color: (review.finalScore || 0) >= 3 ? '#16a34a' : '#ef4444' }}>
          {review.finalScore?.toFixed(1)} / 5.0
        </span>
      </div>
    </div>
  </div>
);

const EmployeePerformance: React.FC = () => {
  const [reviews, setReviews]         = useState<PerformanceReview[]>([]);
  const [training, setTraining]       = useState<TrainingRecord[]>([]);
  const [disciplinary, setDisciplinary] = useState<DisciplinaryAction[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'reviews' | 'training' | 'disciplinary'>('reviews');
  const [responding, setResponding]   = useState<PerformanceReview | null>(null);
  const [viewDetail, setViewDetail]   = useState<{ review: PerformanceReview; scores: CompetencyScore[] } | null>(null);
  const [feedbackReview, setFeedbackReview] = useState<PerformanceReview | null>(null);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([]);
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<number, { rating?: number; textAnswer?: string }>>({});
  const [responseForm, setResponseForm] = useState<{ response: 'ACCEPTED' | 'REJECTED' | ''; comment: string }>({ response: '', comment: '' });
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    Promise.all([getMyReviews(), getMyTraining(), getMyDisciplinary()])
      .then(([r, t, d]) => { setReviews(r.data); setTraining(t.data); setDisciplinary(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleViewDetail = async (r: PerformanceReview) => {
    try { const res = await getReviewScores(r.id); setViewDetail({ review: r, scores: res.data }); }
    catch { toast.error('Could not load scores'); }
  };

  const handleOpenFeedback = async (r: PerformanceReview) => {
    try {
      const res = await getFeedbackQuestions();
      setFeedbackQuestions(res.data);
      setFeedbackAnswers({});
      setFeedbackReview(r);
    } catch { toast.error('Could not load feedback questions'); }
  };

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responding || !responseForm.response) return;
    if (responseForm.response === 'REJECTED' && !responseForm.comment.trim()) {
      toast.error('Please explain why you are disputing'); return;
    }
    setSubmitting(true);
    try {
      const res = await respondToAppraisal(responding.id, { response: responseForm.response, comment: responseForm.comment });
      setReviews(prev => prev.map(r => r.id === responding.id ? res.data : r));
      toast.success(responseForm.response === 'ACCEPTED' ? 'Appraisal acknowledged!' : 'Dispute submitted');
      setResponding(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackReview) return;
    setSubmitting(true);
    try {
      const answers = feedbackQuestions.map(q => ({
        questionId: q.id,
        rating: feedbackAnswers[q.id]?.rating,
        textAnswer: feedbackAnswers[q.id]?.textAnswer,
      }));
      const res = await submitFeedback(feedbackReview.id, { answers });
      setReviews(prev => prev.map(r => r.id === feedbackReview.id ? res.data : r));
      toast.success('Feedback submitted — thank you!');
      setFeedbackReview(null);
    } catch (err: any) { const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to submit feedback'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  const pending   = reviews.filter(r => r.status === 'APPRAISED');
  const feedback  = reviews.filter(r => r.status === 'FEEDBACK_PENDING');
  const others    = reviews.filter(r => r.status !== 'APPRAISED' && r.status !== 'FEEDBACK_PENDING');

  const TabBtn = ({ id, label, badge }: { id: typeof tab; label: string; badge?: number }) => (
    <button onClick={() => setTab(id)} style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer',
      fontWeight:600, fontSize:13, background: tab === id ? '#4f9cff' : '#f1f5f9', color: tab === id ? '#fff' : '#374151' }}>
      {label}{badge ? <span style={{ marginLeft:6, background: tab === id ? 'rgba(255,255,255,0.3)' : '#ef4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:11 }}>{badge}</span> : null}
    </button>
  );

  return (
    <div>
      <div className="page-header"><h1>My Performance</h1><p>Appraisals, training and disciplinary records</p></div>

      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        <TabBtn id="reviews"      label="Reviews"      badge={pending.length + feedback.length} />
        <TabBtn id="training"     label="Training"     badge={training.filter(t => t.status === 'SCHEDULED').length || undefined} />
        <TabBtn id="disciplinary" label="Disciplinary" badge={disciplinary.length || undefined} />
      </div>

      {/* ── REVIEWS TAB ── */}
      {tab === 'reviews' && (<>
        {/* Action required banners */}
        {[...pending, ...feedback].length > 0 && (
          <div style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:12, padding:16, marginBottom:24 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>⚠️ Action Required</div>
            {pending.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:8, padding:'12px 16px', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                <div>
                  <span style={{ fontWeight:600 }}>{r.reviewPeriod}</span>
                  <span style={{ color:'#64748b', fontSize:13, marginLeft:12 }}>Final Score: {r.finalScore}/5.0</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleViewDetail(r)}>View Scores</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setResponding(r); setResponseForm({ response:'', comment:'' }); }}>Respond</button>
                </div>
              </div>
            ))}
            {feedback.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:8, padding:'12px 16px', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                <div>
                  <span style={{ fontWeight:600 }}>{r.reviewPeriod}</span>
                  <span style={{ color:'#ea580c', fontSize:13, marginLeft:12 }}>Feedback required</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenFeedback(r)}>📝 Submit Feedback</button>
              </div>
            ))}
          </div>
        )}

        {others.length === 0 && pending.length === 0 && feedback.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">📊</div><p>No performance reviews yet</p></div></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {others.map(r => {
                const sm = STATUS_META[r.status];
                return (
                  <div className="card" key={r.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:700, fontSize:16 }}>{r.reviewPeriod}</span>
                          <span style={{ background:sm.bg, color:sm.color, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{sm.label}</span>
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:13, color:'#64748b', flexWrap:'wrap' }}>
                          <span>👔 {r.manager.fullName}</span>
                          {r.finalScore != null && <span>⭐ Final: <strong style={{ color:'#1a1a2e' }}>{r.finalScore}/5.0</strong></span>}
                          {r.appraisedAt && <span>📅 {format(new Date(r.appraisedAt), 'dd MMM yyyy')}</span>}
                        </div>
                        {r.finalScore != null && <ScoreBreakdown review={r} />}
                        {r.recommendation && (
                          <div style={{ marginTop:12 }}>
                            <span style={{ background:RECOMMENDATION_META[r.recommendation].bg, color:RECOMMENDATION_META[r.recommendation].color,
                              padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>
                              {RECOMMENDATION_META[r.recommendation].icon} {RECOMMENDATION_META[r.recommendation].label}
                              {r.trainingType && ` — ${r.trainingType.name}`}
                            </span>
                          </div>
                        )}
                      </div>
                      {r.finalScore != null && (
                        <button className="btn btn-outline btn-sm" onClick={() => handleViewDetail(r)}>View Scores</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </>)}

      {/* ── TRAINING TAB ── */}
      {tab === 'training' && (
        training.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">📚</div><p>No training records yet</p></div></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {training.map(t => {
                const sm = TRAINING_STATUS_META[t.status];
                return (
                  <div className="card" key={t.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{t.trainingType.name}</div>
                        {t.review && <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>From {t.review.reviewPeriod} appraisal</div>}
                        <div style={{ marginTop:8, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={{ background:sm.bg, color:sm.color, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{sm.label}</span>
                          {t.scheduledDate && <span style={{ fontSize:13, color:'#64748b' }}>📅 Scheduled: {format(new Date(t.scheduledDate), 'dd MMM yyyy')}</span>}
                          {t.completedDate && <span style={{ fontSize:13, color:'#16a34a' }}>✅ Completed: {format(new Date(t.completedDate), 'dd MMM yyyy')}</span>}
                        </div>
                        {t.notes && <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>{t.notes}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* ── DISCIPLINARY TAB ── */}
      {tab === 'disciplinary' && (
        disciplinary.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">✅</div><p>No disciplinary actions on record</p></div></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {disciplinary.map(d => (
                <div className="card" key={d.id} style={{ borderLeft:'4px solid #ef4444' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{d.offenceCategory.name}</div>
                      <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>
                        Period: {d.reviewPeriod} · Logged: {format(new Date(d.loggedAt), 'dd MMM yyyy')}
                      </div>
                      {d.description && <div style={{ fontSize:13, color:'#374151', marginTop:6, background:'#f8fafc', padding:'6px 10px', borderRadius:6 }}>{d.description}</div>}
                    </div>
                    <div style={{ fontWeight:800, fontSize:20, color:'#ef4444' }}>
                      {d.offenceCategory.deductionMark > 0 ? '+' : ''}{d.offenceCategory.deductionMark}
                    </div>
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* Respond modal */}
      {responding && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:500 }}>
            <div className="modal-header">
              <h2>Respond — {responding.reviewPeriod}</h2>
              <button className="modal-close" onClick={() => setResponding(null)}>✕</button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginBottom:20 }}>
              <div style={{ fontSize:13, color:'#64748b' }}>Appraised by <strong>{responding.manager.fullName}</strong></div>
              <ScoreBreakdown review={responding} />
            </div>
            <form onSubmit={handleRespond}>
              <div className="form-group">
                <label>Your Response</label>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  {(['ACCEPTED','REJECTED'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setResponseForm(f => ({ ...f, response:r }))}
                      style={{ flex:1, padding:14, borderRadius:10, border:`2px solid ${responseForm.response === r ? (r === 'ACCEPTED' ? '#22c55e' : '#ef4444') : '#e2e8f0'}`,
                        background: responseForm.response === r ? (r === 'ACCEPTED' ? '#dcfce7' : '#fee2e2') : '#fff',
                        cursor:'pointer', fontWeight:700, color: responseForm.response === r ? (r === 'ACCEPTED' ? '#16a34a' : '#dc2626') : '#374151' }}>
                      {r === 'ACCEPTED' ? '✅ Accept' : '⚠️ Dispute'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>{responseForm.response === 'REJECTED' ? 'Reason for Dispute *' : 'Comment (optional)'}</label>
                <textarea value={responseForm.comment} onChange={e => setResponseForm(f => ({ ...f, comment:e.target.value }))}
                  rows={4} style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className={`btn ${responseForm.response === 'REJECTED' ? 'btn-danger' : 'btn-success'}`}
                  disabled={submitting || !responseForm.response}>
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setResponding(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {feedbackReview && feedbackQuestions.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="modal-header">
              <h2>Appraisal Feedback — {feedbackReview.reviewPeriod}</h2>
              <button className="modal-close" onClick={() => setFeedbackReview(null)}>✕</button>
            </div>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
              Your feedback is confidential and visible to HR only — not your manager.
            </p>
            <form onSubmit={handleSubmitFeedback}>
              {feedbackQuestions.map((q, i) => (
                <div key={q.id} style={{ marginBottom:24, paddingBottom:24, borderBottom: i < feedbackQuestions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>{i + 1}. {q.questionText}</div>
                  {(q.type === 'RATING' || q.type === 'BOTH') && (
                    <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onClick={() => setFeedbackAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], rating:n } }))}
                          style={{ background:'none', border:'none', cursor:'pointer', fontSize:28,
                            color: (feedbackAnswers[q.id]?.rating || 0) >= n ? '#f59e0b' : '#e2e8f0' }}>★</button>
                      ))}
                    </div>
                  )}
                  {(q.type === 'TEXT' || q.type === 'BOTH') && (
                    <textarea rows={3} placeholder="Your answer..." style={{ resize:'vertical', width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }}
                      value={feedbackAnswers[q.id]?.textAnswer || ''}
                      onChange={e => setFeedbackAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], textAnswer:e.target.value } }))} />
                  )}
                </div>
              ))}
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : '📤 Submit Feedback'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setFeedbackReview(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scores detail modal */}
      {viewDetail && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header">
              <h2>Scores — {viewDetail.review.reviewPeriod}</h2>
              <button className="modal-close" onClick={() => setViewDetail(null)}>✕</button>
            </div>
            <ScoreBreakdown review={viewDetail.review} />
            <div style={{ marginTop:16 }}>
              {viewDetail.scores.map(s => (
                <div key={s.id} style={{ marginBottom:14, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{COMPETENCY_LABELS[s.competency]}</span>
                  </div>
                  <ScoreBar score={s.score} />
                  {s.comment && <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{s.comment}</div>}
                </div>
              ))}
            </div>
            {viewDetail.review.appraisalSummary && (
              <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginTop:8 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Manager Summary</div>
                <div style={{ fontSize:13, color:'#475569' }}>{viewDetail.review.appraisalSummary}</div>
              </div>
            )}
            <div style={{ marginTop:16 }}>
              <button className="btn btn-outline" onClick={() => setViewDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformance;
