import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as apiLogin, register as apiRegister } from '../api/leaveApi';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '', password: '', fullName: '', department: '', position: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await apiLogin(form.email, form.password);
        login(res.data);
        toast.success(`Welcome back, ${res.data.fullName}!`);
        navigate(res.data.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard');
      } else {
        const res = await apiRegister(form);
        login(res.data);
        toast.success('Account created successfully!');
        navigate('/employee/dashboard');
      }
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(typeof d === 'string' ? d : d?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h2>Statco <span>HR</span></h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Leave Management System</p>
        </div>
        <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p>{isLogin ? 'Sign in to your account' : 'Register a new employee account'}</p>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="John Doe" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input name="department" value={form.department} onChange={handleChange} placeholder="Engineering" />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input name="position" value={form.position} onChange={handleChange} placeholder="Developer" />
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@statco.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="auth-switch">
          {isLogin ? (
            <span>No account? <a onClick={() => setIsLogin(false)}>Register here</a></span>
          ) : (
            <span>Already have an account? <a onClick={() => setIsLogin(true)}>Sign in</a></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
