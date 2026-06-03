import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createStaff, getAllStaff, toggleActive, resetPassword, assignGrade } from '../../api/staffApi';
import { getDepartments, createDepartment, deactivateDepartment, Department } from '../../api/departmentApi';
import { Grade } from '../../types/loan';
import { getAllGrades, createGrade, deleteGrade } from '../../api/loanApi';

const StaffManagement: React.FC = () => {
    const [staff, setStaff] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGradeAssign, setShowGradeAssign] = useState<any | null>(null);
    const [assignGradeId, setAssignGradeId] = useState<number | ''>('');
    const [showCreate, setShowCreate] = useState(false);
    const [showReset, setShowReset] = useState<any | null>(null);
    const [showDeptManager, setShowDeptManager] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [deptSearch, setDeptSearch] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [form, setForm] = useState({
        fullName: '', email: '', temporaryPassword: '',
        department: '', position: '', phone: '', role: 'EMPLOYEE', approvalLevel: 'NONE', gradeId: '' as number | ''
    });

    useEffect(() => {
        Promise.all([getAllStaff(), getDepartments(), getAllGrades()])
            .then(([s, d, g]) => {
                console.log('getAllStaff response:', s.data);
                console.log('getDepartments response:', d.data);
                console.log('getAllGrades response:', g.data);
                setStaff(Array.isArray(s.data) ? s.data : []);
                setDepartments(Array.isArray(d.data) ? d.data : []);
                setGrades(Array.isArray(g.data) ? g.data : []);
            })
            .catch((err) => { console.error('StaffManagement load error:', err); })
            .finally(() => setLoading(false));
    }, []);


    const handleAddDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;
        try {
            const res = await createDepartment({ name: newDeptName.trim() });
            setDepartments(prev => [...prev, res.data].sort((a,b) => a.name.localeCompare(b.name)));
            toast.success(`Department "${newDeptName}" added`);
            setNewDeptName('');
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.error || 'Failed');
        }
    };

    const handleRemoveDept = async (dept: Department) => {
        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Remove "{dept.name}"?</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>This action cannot be undone.</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await deactivateDepartment(dept.id);
                                setDepartments(prev => prev.filter(d => d.id !== dept.id));
                                toast.success(`"${dept.name}" removed`);
                            } catch {
                                toast.error('Failed to remove department');
                            }
                        }}
                        style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Yes, remove
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ padding: '6px 14px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const handleAddGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGradeName.trim()) { toast.error('Please enter a grade name'); return; }
        if (newGradeLevel === '') { toast.error('Please enter a grade level'); return; }
        const duplicate = grades.find(g => g.name.toLowerCase() === newGradeName.trim().toLowerCase());
        if (duplicate) { toast.error(`"${newGradeName}" already exists`); return; }
        const dupLevel = grades.find(g => g.level === Number(newGradeLevel));
        if (dupLevel) { toast.error(`Level ${newGradeLevel} is already used by "${dupLevel.name}"`); return; }
        try {
            const res = await createGrade({ name: newGradeName.trim(), level: Number(newGradeLevel) });
            setGrades(prev => [...prev, res.data].sort((a, b) => a.level - b.level));
            toast.success(`"${newGradeName}" added`);
            setNewGradeName('');
            setNewGradeLevel('');
        } catch (err: any) {
            const d = err.response?.data;
            toast.error(typeof d === 'string' ? d : d?.message || d?.error || 'Failed to add grade');
        }
    };

    const handleRemoveGrade = async (grade: Grade) => {
        toast((t) => (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>Remove "{grade.name}"?</span>
                <span style={{ fontSize:13, color:'#64748b' }}>Staff assigned this grade will become ungraded.</span>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await deleteGrade(grade.id);
                                setGrades(prev => prev.filter(g => g.id !== grade.id));
                                toast.success(`"${grade.name}" removed`);
                            } catch { toast.error('Failed to remove grade'); }
                        }}
                        style={{ padding:'6px 14px', background:'#dc2626', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' }}
                    >
                        Yes, remove
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ padding:'6px 14px', background:'#f1f5f9', color:'#334155', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };
    const [showViewDetails, setShowViewDetails] = useState<any | null>(null);
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await createStaff({...form, role: form.role as "ADMIN" | "EMPLOYEE" | "ACCOUNT", gradeId: form.gradeId !== '' ? form.gradeId : null} as any);
            setStaff(prev => [res.data, ...prev]);
            toast.success(`${form.fullName} added! They'll be prompted to change password on first login.`);
            setShowCreate(false);
            setForm({ fullName:'', email:'', temporaryPassword:'', department:'', position:'', phone:'', role:'EMPLOYEE', approvalLevel:'NONE', gradeId:'' });
        } catch (err: any) {
            const _d = err.response?.data; toast.error(typeof _d === 'string' ? _d : _d?.error || 'Failed to create staff');
        } finally { setSubmitting(false); }
    };

    const handleToggle = async (id: number, name: string, active: boolean) => {
        if (!window.confirm(`${active ? 'Deactivate' : 'Activate'} ${name}?`)) return;
        try {
            const res = await toggleActive(id);
            setStaff(prev => prev.map(s => s.id === id ? res.data : s));
            toast.success(`${name} ${active ? 'deactivated' : 'activated'}`);
        } catch { toast.error('Failed'); }
    };

    const handleAssignGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showGradeAssign) return;
        setSubmitting(true);
        try {
            const res = await assignGrade(showGradeAssign.id, assignGradeId !== '' ? assignGradeId as number : null);
            setStaff(prev => prev.map(s => s.id === showGradeAssign.id ? res.data : s));
            toast.success(`Grade updated for ${showGradeAssign.fullName}`);
            setShowGradeAssign(null);
        } catch { toast.error('Failed to assign grade'); }
        finally { setSubmitting(false); }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showReset) return;
        setSubmitting(true);
        try {
            await resetPassword(showReset.id, { newPassword });
            toast.success(`Password reset for ${showReset.fullName}. They'll be prompted to change on next login.`);
            setShowReset(null);
            setNewPassword('');
        } catch { toast.error('Failed'); }
        finally { setSubmitting(false); }
    };

    const filtered = staff.filter(s =>
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase())
    );
    const detailsRefs = React.useRef<{ [key: number]: HTMLDetailsElement | null }>({});

    const closeDropdown = (id: number) => {
        if (detailsRefs.current[id]) {
            detailsRefs.current[id]!.removeAttribute('open');
        }
    };
    const [showGradeManager, setShowGradeManager] = useState(false);
    const [newGradeName, setNewGradeName] = useState('');
    const [newGradeLevel, setNewGradeLevel] = useState<number | ''>('');
    const [gradeSearch, setGradeSearch] = useState('');

    if (loading) return <div className="loading"><div className="spinner"/></div>;

    return (
        <div>
            <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                    <h1>Staff Management</h1>
                    <p>Create accounts, manage access and reset passwords</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline" onClick={() => setShowDeptManager(true)}>🏢 Departments</button>
                    <button className="btn btn-outline" onClick={() => setShowGradeManager(true)}>🎓 Grades</button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Staff</button>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:24 }}>
                <div className="stat-card"><span className="stat-icon">👥</span><div className="stat-label">Total Staff</div><div className="stat-value">{staff.length}</div></div>
                <div className="stat-card"><span className="stat-icon">✅</span><div className="stat-label">Active</div><div className="stat-value" style={{ color:'#16a34a' }}>{staff.filter(s => s.active).length}</div></div>
                <div className="stat-card"><span className="stat-icon">⏳</span><div className="stat-label">Pending Password Change</div><div className="stat-value" style={{ color:'#d97706' }}>{staff.filter(s => s.mustChangePassword).length}</div></div>
            </div>

            <div className="card">
                {/* Search */}
                <div style={{ marginBottom:16 }}>
                    <input
                        style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14 }}
                        placeholder="🔍 Search by name, email or department..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="icon">👤</div><p>No staff found</p></div>
                ) : (
                    <div className="table-wrapper" style={{ overflowX:'auto' }}>
                        <table style={{ minWidth:680 }}>
                            <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Department</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Grade</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(s => (
                                <tr key={s.id}>
                                    <td style={{ minWidth:180 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                            <div style={{
                                                width:36, height:36, borderRadius:'50%',
                                                background: `hsl(${(s.id * 47) % 360}, 60%, 65%)`,
                                                display:'flex', alignItems:'center', justifyContent:'center',
                                                fontWeight:700, fontSize:14, color:'#fff', flexShrink:0
                                            }}>{s.fullName
                                                ?.split(' ')
                                                .map((n:string) => n[0])
                                                .join('')
                                                .substring(0,2)
                                                .toUpperCase()}</div>
                                            <div>
                                                <div style={{ fontWeight:600, fontSize:14 }}>{s.fullName}</div>
                                                {s.phone && <div style={{ fontSize:12, color:'#94a3b8' }}>{s.phone}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize:13, fontWeight:600 }}>{s.department || '—'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, width:'fit-content',
                                                background: s.role === 'ADMIN' ? '#ede9fe' : s.role === 'ACCOUNT' ? '#fef3c7' : '#dbeafe',
                                                color: s.role === 'ADMIN' ? '#7c3aed' : s.role === 'ACCOUNT' ? '#d97706' : '#1d4ed8' }}>{s.role}</span>
                                            {s.approvalLevel && s.approvalLevel !== 'NONE' && (
                                                <span style={{ fontSize:11, color:'#64748b' }}>{s.approvalLevel.replace('_',' ')}</span>
                                            )}

                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                                            background: s.active ? '#dcfce7' : '#fee2e2',
                                            color: s.active ? '#16a34a' : '#dc2626' }}>{s.active ? 'Active' : 'Inactive'}</span>
                                    </td>
                                    {/* Grade column */}
                                    <td>
                                        {s.grade ? (
                                            <span style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#e0f2fe', color:'#0369a1', whiteSpace:'nowrap' }}>
            {s.grade.name}
        </span>
                                        ) : (
                                            <span style={{ fontSize:12, color:'#94a3b8' }}>No grade</span>
                                        )}
                                    </td>

                                    {/* Actions column */}
                                    <td style={{ textAlign:'center' }}>
                                        <details
                                            className="staff-actions-dropdown"
                                            style={{ position: 'relative', display: 'inline-block' }}
                                            ref={el => { detailsRefs.current[s.id] = el; }}
                                        >
                                            <summary style={{ cursor:'pointer', listStyle:'none', fontSize:22, fontWeight:700, padding:'0 8px' }}>⋮</summary>
                                            <div style={{ position:'absolute', right:0, marginTop:8, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.08)', minWidth:180, zIndex:100 }}>
                                                <button className="dropdown-item" onClick={() => { setShowViewDetails(s); closeDropdown(s.id); }}>
                                                    👁 View Details
                                                </button>
                                                <button className="dropdown-item" onClick={() => { setShowGradeAssign(s); setAssignGradeId(s.grade?.id ?? ''); closeDropdown(s.id); }}>
                                                    🎓 Assign Grade
                                                </button>
                                                <button className="dropdown-item" onClick={() => { setShowReset(s); setNewPassword(''); closeDropdown(s.id); }}>
                                                    🔑 Reset Password
                                                </button>
                                                <button className="dropdown-item" onClick={() => { handleToggle(s.id, s.fullName, s.active); closeDropdown(s.id); }} style={{ color: s.active ? '#dc2626' : '#16a34a' }}>
                                                    {s.active ? '🚫 Deactivate' : '✅ Activate'}
                                                </button>
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {showViewDetails && (
                            <div className="modal-overlay">
                                <div className="modal" style={{ maxWidth: 480 }}>
                                    <div className="modal-header">
                                        <h2>Staff Details</h2>
                                        <button className="modal-close" onClick={() => setShowViewDetails(null)}>✕</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: '50%',
                                                background: `hsl(${(showViewDetails.id * 47) % 360}, 60%, 65%)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: 22, color: '#fff', flexShrink: 0
                                            }}>
                                                {showViewDetails.fullName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 16 }}>{showViewDetails.fullName}</div>
                                                <div style={{ fontSize: 13, color: '#64748b' }}>{showViewDetails.email}</div>
                                            </div>
                                        </div>

                                        {[
                                            ['Department',     showViewDetails.department   || '—'],
                                            ['Position',       showViewDetails.position     || '—'],
                                            ['Phone',          showViewDetails.phone        || '—'],
                                            ['Role',           showViewDetails.role         || '—'],
                                            ['Approval Level', showViewDetails.approvalLevel?.replace('_',' ') || '—'],
                                            ['Grade',          showViewDetails.grade?.name  || 'No grade'],
                                            ['Status',         showViewDetails.active ? 'Active' : 'Inactive'],
                                            ['Must Change PW', showViewDetails.mustChangePassword ? 'Yes' : 'No'],
                                        ].map(([label, value]) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</span>
                                                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: 20 }}>
                                        <button className="btn btn-outline" onClick={() => setShowViewDetails(null)}>Close</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create staff modal */}
            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth:520 }}>
                        <div className="modal-header">
                            <h2>Add New Staff</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input value={form.fullName} onChange={e => setForm(f => ({...f, fullName:e.target.value}))} required placeholder="John Doe" />
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} required placeholder="john@statco.com" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Temporary Password *</label>
                                <input type="password" value={form.temporaryPassword} onChange={e => setForm(f => ({...f, temporaryPassword:e.target.value}))} required placeholder="Min 6 characters" minLength={6} />
                                <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Staff will be required to change this on first login.</div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Department</label>
                                    <select value={form.department} onChange={e => setForm(f => ({...f, department:e.target.value}))}>
                                        <option value="">— Select department —</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Position</label>
                                    <input value={form.position} onChange={e => setForm(f => ({...f, position:e.target.value}))} placeholder="Developer" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone:e.target.value}))} placeholder="+234..." />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}>
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="ACCOUNT">Accounts</option>
                                        <option value="ADMIN">Admin / HR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Approval Level</label>
                                <select value={form.approvalLevel} onChange={e => setForm(f => ({...f, approvalLevel:e.target.value}))}>
                                    <option value="NONE">None (Regular Staff)</option>
                                    <option value="UNIT_HEAD">Unit Head</option>
                                    <option value="DIV_HEAD">Divisional Head</option>
                                    <option value="MD">MD / Director</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Grade (for loan guarantor eligibility)</label>
                                <select value={form.gradeId} onChange={e => setForm(f => ({...f, gradeId: e.target.value === '' ? '' : Number(e.target.value)}))}>
                                    <option value="">— No grade —</option>
                                    {grades.sort((a,b) => a.level - b.level).map(g => <option key={g.id} value={g.id}>{g.name} (Level {g.level})</option>)}
                                </select>
                                <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Assign a grade so this staff can be selected as a loan guarantor.</div>
                            </div>
                            <div style={{ display:'flex', gap:10 }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : '✅ Create Account'}</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Department manager modal */}
            {showDeptManager && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 17 }}>Departments</h2>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowDeptManager(false)}>✕</button>
                        </div>

                        {/* Add new */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: '0 0 10px' }}>Add new department</p>
                            <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={newDeptName}
                                    onChange={e => setNewDeptName(e.target.value)}
                                    placeholder="Department name e.g. Finance Unit"
                                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                                    + Add
                                </button>
                            </form>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '12px 24px 8px' }}>
                            <input
                                placeholder="🔍 Search departments..."
                                onChange={e => setDeptSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* List */}
                        <div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                            {departments
                                .filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
                                .map(d => (
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>🏢</div>
                                            <span style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</span>
                                        </div>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDept(d)}>Remove</button>
                                    </div>
                                ))}
                            {departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase())).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                                    <div style={{ fontSize: 28 }}>🏢</div>
                                    <p style={{ margin: '8px 0 0', fontSize: 14 }}>No departments found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Grade manager modal */}
            {showGradeManager && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div>
                                <h2 style={{ margin:0, fontSize:17 }}>Grades</h2>
                                <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748b' }}>{grades.length} grade{grades.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowGradeManager(false)}>✕</button>
                        </div>

                        {/* Add new */}
                        <div style={{ padding:'16px 24px', borderBottom:'1px solid #e2e8f0' }}>
                            <p style={{ fontSize:13, fontWeight:600, color:'#64748b', margin:'0 0 10px' }}>Add new grade</p>
                            <form onSubmit={handleAddGrade} style={{ display:'flex', gap:8 }}>
                                <input
                                    value={newGradeName}
                                    onChange={e => setNewGradeName(e.target.value)}
                                    placeholder="Grade name e.g. Manager"
                                    style={{ flex:2, padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14 }}
                                />
                                <input
                                    type="number"
                                    value={newGradeLevel}
                                    onChange={e => setNewGradeLevel(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Level"
                                    min={1}
                                    style={{ flex:1, padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14 }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ whiteSpace:'nowrap' }}>
                                    + Add
                                </button>
                            </form>
                            <p style={{ fontSize:12, color:'#94a3b8', margin:'6px 0 0' }}>Level determines hierarchy — higher number = more senior.</p>
                        </div>

                        {/* Search */}
                        <div style={{ padding:'12px 24px 8px' }}>
                            <input
                                placeholder="🔍 Search grades..."
                                value={gradeSearch}
                                onChange={e => setGradeSearch(e.target.value)}
                                style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#f8fafc', boxSizing:'border-box' }}
                            />
                        </div>

                        {/* List */}
                        <div style={{ padding:'8px 24px 20px', display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto' }}>
                            {grades
                                .filter(g => g.name.toLowerCase().includes(gradeSearch.toLowerCase()))
                                .map(g => (
                                    <div key={g.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                            <div style={{ width:30, height:30, borderRadius:8, background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                <span style={{ fontSize:12, fontWeight:700, color:'#7c3aed' }}>L{g.level}</span>
                                            </div>
                                            <span style={{ fontSize:14, fontWeight:600 }}>{g.name}</span>
                                        </div>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveGrade(g)}>Remove</button>
                                    </div>
                                ))
                            }
                            {grades.filter(g => g.name.toLowerCase().includes(gradeSearch.toLowerCase())).length === 0 && (
                                <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
                                    <div style={{ fontSize:28 }}>🎓</div>
                                    <p style={{ margin:'8px 0 0', fontSize:14 }}>No grades found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign grade modal */}
            {showGradeAssign && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth:420 }}>
                        <div className="modal-header">
                            <h2>Assign Grade — {showGradeAssign.fullName}</h2>
                            <button className="modal-close" onClick={() => setShowGradeAssign(null)}>✕</button>
                        </div>
                        <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
                            The grade determines guarantor eligibility for loans. A guarantor must have a higher grade than the loan applicant.
                        </p>
                        <form onSubmit={handleAssignGrade}>
                            <div className="form-group">
                                <label>Grade</label>
                                <select value={assignGradeId} onChange={e => setAssignGradeId(e.target.value === '' ? '' : Number(e.target.value))}>
                                    <option value="">— No grade —</option>
                                    {grades.sort((a,b) => a.level - b.level).map(g => <option key={g.id} value={g.id}>{g.name} (Level {g.level})</option>)}
                                </select>
                            </div>
                            {grades.length === 0 && (
                                <p style={{ fontSize:12, color:'#d97706', marginBottom:12 }}>No grades have been created yet. Go to Loans &gt; Grades to set them up first.</p>
                            )}
                            <div style={{ display:'flex', gap:10 }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '🎓 Save Grade'}</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowGradeAssign(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset password modal */}
            {showReset && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth:420 }}>
                        <div className="modal-header">
                            <h2>Reset Password — {showReset.fullName}</h2>
                            <button className="modal-close" onClick={() => setShowReset(null)}>✕</button>
                        </div>
                        <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
                            Set a new temporary password. {showReset.fullName} will be required to change it on next login.
                        </p>
                        <form onSubmit={handleReset}>
                            <div className="form-group">
                                <label>New Temporary Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
                            </div>
                            <div style={{ display:'flex', gap:10 }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '🔑 Reset Password'}</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowReset(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;