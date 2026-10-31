import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/shipment.js';
import { api } from '../services/api.js';

interface AuthContextType {
  // Customer Session
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;

  register: (data: {
    name: string;
    email: string;
    password: string;
    company?: string;
    phone?: string;
  }) => Promise<{
    message: string;
    requiresVerification: boolean;
    email: string;
  }>;

  verifyEmail: (email: string, code: string) => Promise<void>;

  logout: () => void;

  // Protected Administrator Session (completely separated)
  adminUser: User | null;
  adminToken: string | null;
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => void;
  isAdminInitialized: boolean;
  refreshAdminStatus: () => Promise<void>;

  // Customer Auth Dialog State
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Customer State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('freightplus_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Separate Administrator State
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('freightplus_admin_token'));
  const [isAdminInitialized, setIsAdminInitialized] = useState<boolean>(true);

  // Customer Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const checkAdminStatus = async () => {
    try {
      const res = await api.auth.getAdminStatus();
      setIsAdminInitialized(res.isInitialized);
    } catch {
      // Default to true to be safe
    }
  };
// Verify customer email and create customer session
const verifyEmail = async (email: string, code: string) => {
  const res = await api.auth.verifyEmail(email, code);

  localStorage.setItem('freightplus_token', res.token);
  setToken(res.token);
  setUser(res.user);
  setIsAuthModalOpen(false);
};
  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);

      // Check admin initialization status
      await checkAdminStatus();

      // Load Customer Session
      const storedToken = localStorage.getItem('freightplus_token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          if (res.user.role === 'client') {
            setUser(res.user);
          }
        } catch {
          localStorage.removeItem('freightplus_token');
          setToken(null);
          setUser(null);
        }
      }

      // Load Separate Admin Session
      const storedAdminToken = localStorage.getItem('freightplus_admin_token');
      if (storedAdminToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedAdminToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user?.role === 'admin') {
              setAdminUser(data.user);
            } else {
              localStorage.removeItem('freightplus_admin_token');
              setAdminToken(null);
            }
          }
        } catch {
          localStorage.removeItem('freightplus_admin_token');
          setAdminToken(null);
        }
      }

      setIsLoading(false);
    }

    loadSessions();
  }, []);

  // Customer Login
  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('freightplus_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

 // Customer Register (Strictly client only)
const register = async (data: {
  name: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
}) => {
  const res = await api.auth.register(data);

  // Registration does not create a customer session.
  // The customer must verify their email first.
  setIsAuthModalOpen(true);

  return {
    message: res.message,
    requiresVerification: res.requiresVerification,
    email: res.email,
  };
};

  // Customer Logout
  const logout = () => {
    localStorage.removeItem('freightplus_token');
    setToken(null);
    setUser(null);
  };

  // Dedicated Admin Login
  const adminLogin = async (email: string, password: string) => {
    const res = await api.auth.adminLogin(email, password);
    localStorage.setItem('freightplus_admin_token', res.token);
    setAdminToken(res.token);
    setAdminUser(res.user);
  };

  // Dedicated Admin Logout
  const adminLogout = () => {
    localStorage.removeItem('freightplus_admin_token');
    setAdminToken(null);
    setAdminUser(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    verifyEmail,
    logout,

    adminUser,
    adminToken,
    isAdminAuthenticated: !!adminUser && adminUser.role === 'admin',
    adminLogin,
    adminLogout,
    isAdminInitialized,
    refreshAdminStatus: checkAdminStatus,

    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
