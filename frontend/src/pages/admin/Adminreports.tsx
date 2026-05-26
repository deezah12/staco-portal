import React, { useEffect, useState, useRef } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#4f9cff','#22c55e','#f59e0b','#ef4444','#7c3aed','#0891b2','#d97706','#16a34a'];

type Tab = 'summary' | 'leave' | 'loans' | 'performance';

const fmt = (n: number) => new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0 }).format(n);
const fmtCurrency = (n: number) => `₦${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 }).format(n)}`;

const toChartData = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

const KPICard: React.FC<{ label: string; value: string | number; icon: string; color?: string }> = ({ label, value, icon, color }) => (
    <div className="stat-card">
        <span className="stat-icon">{icon}</span>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: color || '#1a1a2e', fontSize: 26 }}>{value}</div>
    </div>
);

const AdminReports: React.FC = () => {
    const [tab, setTab] = useState<Tab>('summary');
    const [summary, setSummary] = useState<any>(null);
    const [leaveData, setLeaveData] = useState<any>(null);
    const [loanData, setLoanData] = useState<any>(null);
    const [perfData, setPerfData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get('/reports/summary').then(r => setSummary(r.data));
    }, []);

    useEffect(() => {
        if (tab === 'leave' && !leaveData) {
            setLoading(true);
            api.get('/reports/leave').then(r => setLeaveData(r.data)).finally(() => setLoading(false));
        }
        if (tab === 'loans' && !loanData) {
            setLoading(true);
            api.get('/reports/loans').then(r => setLoanData(r.data)).finally(() => setLoading(false));
        }
        if (tab === 'performance' && !perfData) {
            setLoading(true);
            api.get('/reports/performance').then(r => setPerfData(r.data)).finally(() => setLoading(false));
        }
    }, [tab]);

    const exportExcel = (data: any[], filename: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const exportPDF = (title: string, columns: string[], rows: (string | number | null)[][]) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Statco HR — ${title}`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}`, 14, 26);
        autoTable(doc, {
            head: [columns],
            body: rows.map(r => r.map(v => v ?? '—')),
            startY: 32,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [79, 156, 255] },
        });
        doc.save(`${title.replace(/ /g,'_')}.pdf`);
    };

    const tabStyle = (t: Tab) => ({
        padding: '10px 22px', background: 'none', border: 'none', cursor: 'pointer',
        fontWeight: tab === t ? 700 : 500, fontSize: 14,
        color: tab === t ? '#4f9cff' : '#64748b',
        borderBottom: tab === t ? '2px solid #4f9cff' : '2px solid transparent',
        marginBottom: -2, transition: 'all 0.15s',
    });

    return (
        <div ref={reportRef}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Reports & Analytics</h1>
                    <p>Insights across leave, loans and performance</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
                {(['summary','leave','loans','performance'] as Tab[]).map(t => (
                    <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                        {t === 'summary' ? '📊 Summary' : t === 'leave' ? '🏖️ Leave' : t === 'loans' ? '💰 Loans' : '📈 Performance'}
                    </button>
                ))}
            </div>

            {loading && <div className="loading"><div className="spinner"/></div>}

            {/* ── SUMMARY ─────────────────────────────────────────── */}
            {tab === 'summary' && summary && (
                <>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <KPICard label="Total Employees" value={summary.totalEmployees} icon="👥" />
                        <KPICard label="Leave Requests" value={summary.totalLeaveRequests} icon="📋" />
                        <KPICard label="Pending Leave" value={summary.pendingLeave} icon="⏳" color="#d97706" />
                        <KPICard label="Total Loans" value={summary.totalLoans} icon="💰" />
                        <KPICard label="Active Loans" value={summary.activeLoans} icon="💸" color="#7c3aed" />
                        <KPICard label="Performance Reviews" value={summary.totalReviews} icon="📈" />
                        <KPICard label="Pending Appraisals" value={summary.pendingAppraisals} icon="⏳" color="#d97706" />
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                        <p>Click the tabs above to explore detailed reports for each module.</p>
                    </div>
                </>
            )}

            {/* ── LEAVE ───────────────────────────────────────────── */}
            {tab === 'leave' && leaveData && !loading && (
                <>
                    {/* KPIs */}
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <KPICard label="Total Requests" value={leaveData.totalRequests} icon="📋" />
                        <KPICard label="Approved" value={leaveData.byStatus?.APPROVED || 0} icon="✅" color="#16a34a" />
                        <KPICard label="Pending" value={leaveData.byStatus?.PENDING || 0} icon="⏳" color="#d97706" />
                        <KPICard label="Currently On Leave" value={leaveData.currentlyOnLeave?.length || 0} icon="🏖️" color="#4f9cff" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                        {/* By Status pie */}
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Requests by Status</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={toChartData(leaveData.byStatus || {})} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}>
                                        {toChartData(leaveData.byStatus || {}).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* By Type bar */}
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Requests by Leave Type</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={toChartData(leaveData.byType || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#4f9cff" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* By Department bar */}
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Requests by Department</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={toChartData(leaveData.byDepartment || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Monthly trend line */}
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Monthly Approvals Trend</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={toChartData(leaveData.monthlyTrend || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#4f9cff" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Currently on leave table */}
                    {leaveData.currentlyOnLeave?.length > 0 && (
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <h3 style={{ fontWeight: 700, fontSize: 15 }}>🏖️ Currently On Leave</h3>
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Returns</th></tr></thead>
                                    <tbody>
                                    {leaveData.currentlyOnLeave.map((r: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{r.employee}</td>
                                            <td>{r.department || '—'}</td>
                                            <td><span className={`badge badge-${r.type.toLowerCase()}`}>{r.type}</span></td>
                                            <td>{r.endDate}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Export buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline" onClick={() => exportExcel(
                            Object.entries(leaveData.daysByEmployee || {}).map(([emp, days]) => ({ Employee: emp, 'Days Taken': days })),
                            'Leave_Days_Report'
                        )}>📥 Export Excel</button>
                        <button className="btn btn-outline" onClick={() => exportPDF(
                            'Leave Report',
                            ['Employee', 'Days Taken (Approved)'],
                            Object.entries(leaveData.daysByEmployee || {}).map(([emp, days]) => [emp, days as number])
                        )}>📄 Export PDF</button>
                    </div>
                </>
            )}

            {/* ── LOANS ───────────────────────────────────────────── */}
            {tab === 'loans' && loanData && !loading && (
                <>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <KPICard label="Total Loans" value={loanData.totalLoans} icon="💰" />
                        <KPICard label="Total Disbursed" value={fmtCurrency(loanData.totalDisbursed || 0)} icon="💸" color="#7c3aed" />
                        <KPICard label="Outstanding Balance" value={fmtCurrency(loanData.totalOutstanding || 0)} icon="⚠️" color="#ef4444" />
                        <KPICard label="Active Loans" value={loanData.byStatus?.DISBURSED || 0} icon="📊" color="#4f9cff" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Loans by Status</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={toChartData(loanData.byStatus || {})} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}>
                                        {toChartData(loanData.byStatus || {}).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Loans by Department</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={toChartData(loanData.byDepartment || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#7c3aed" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Loan details table */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Loan Details</h3>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Employee</th><th>Dept</th><th>Amount</th><th>Monthly</th><th>Months</th><th>Outstanding</th><th>Status</th><th>Applied</th></tr></thead>
                                <tbody>
                                {(loanData.details || []).map((r: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{r.employee}</td>
                                        <td style={{ color: '#64748b' }}>{r.department || '—'}</td>
                                        <td>{fmtCurrency(r.amount)}</td>
                                        <td>{fmtCurrency(r.monthlyDeduction)}</td>
                                        <td>{r.repaymentMonths}</td>
                                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{fmtCurrency(r.outstanding)}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>{r.status.replace(/_/g,' ')}</span></td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{r.appliedDate}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline" onClick={() => exportExcel(loanData.details || [], 'Loan_Report')}>📥 Export Excel</button>
                        <button className="btn btn-outline" onClick={() => exportPDF(
                            'Loan Report',
                            ['Employee', 'Dept', 'Amount', 'Monthly', 'Months', 'Outstanding', 'Status', 'Applied'],
                            (loanData.details || []).map((r: any) => [r.employee, r.department, fmtCurrency(r.amount), fmtCurrency(r.monthlyDeduction), r.repaymentMonths, fmtCurrency(r.outstanding), r.status, r.appliedDate])
                        )}>📄 Export PDF</button>
                    </div>
                </>
            )}

            {/* ── PERFORMANCE ─────────────────────────────────────── */}
            {tab === 'performance' && perfData && !loading && (
                <>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <KPICard label="Total Reviews" value={perfData.totalReviews} icon="📈" />
                        <KPICard label="Completed" value={perfData.byStatus?.RECOMMENDATION_GIVEN || 0} icon="✅" color="#16a34a" />
                        <KPICard label="Eligible / Pending" value={perfData.byStatus?.ELIGIBLE || 0} icon="⏳" color="#d97706" />
                        <KPICard label="Disputed" value={perfData.byStatus?.DISPUTED || 0} icon="⚠️" color="#ef4444" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Recommendations Breakdown</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={toChartData(perfData.byRecommendation || {})} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }: any) => `${((percent ?? 0)*100).toFixed(0)}%`}>
                                        {toChartData(perfData.byRecommendation || {}).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconSize={10} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Avg Score by Department</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={Object.entries(perfData.avgScoreByDepartment || {}).map(([name, value]) => ({ name, value: Number((value as number).toFixed(1)) }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Score Distribution</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={toChartData(perfData.scoreDistribution || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#4f9cff" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Reviews by Status</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={toChartData(perfData.byStatus || {})}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Details table */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Review Details</h3>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Employee</th><th>Dept</th><th>Period</th><th>Manager</th><th>Score</th><th>Status</th><th>Recommendation</th></tr></thead>
                                <tbody>
                                {(perfData.details || []).map((r: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{r.employee}</td>
                                        <td style={{ color: '#64748b' }}>{r.department || '—'}</td>
                                        <td>{r.period}</td>
                                        <td>{r.manager}</td>
                                        <td>{r.score ? <span style={{ fontWeight: 700, color: '#f59e0b' }}>⭐ {r.score}/5</span> : '—'}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>{r.status.replace(/_/g,' ')}</span></td>
                                        <td style={{ color: '#7c3aed', fontWeight: 600 }}>{r.recommendation ? r.recommendation.replace(/_/g,' ') : '—'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline" onClick={() => exportExcel(perfData.details || [], 'Performance_Report')}>📥 Export Excel</button>
                        <button className="btn btn-outline" onClick={() => exportPDF(
                            'Performance Report',
                            ['Employee', 'Dept', 'Period', 'Manager', 'Score', 'Status', 'Recommendation'],
                            (perfData.details || []).map((r: any) => [r.employee, r.department, r.period, r.manager, r.score ?? '—', r.status, r.recommendation ?? '—'])
                        )}>📄 Export PDF</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminReports;