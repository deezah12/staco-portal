import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthUser, ApprovalLevel } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAdmin: boolean;
  isAccount: boolean;
  isApprover: boolean;       // UNIT_HEAD or DIV_HEAD
  approvalLevel: ApprovalLevel;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (u: AuthUser) => {
    localStorage.setItem('token', u.token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin    = user?.role === 'ADMIN';
  const isAccount  = user?.role === 'ACCOUNT';
  const isApprover = user?.approvalLevel === 'UNIT_HEAD' || user?.approvalLevel === 'DIV_HEAD';
  const approvalLevel: ApprovalLevel = user?.approvalLevel ?? 'NONE';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAccount, isApprover, approvalLevel }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
