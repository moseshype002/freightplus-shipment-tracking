import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Building, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
export const AuthModal: React.FC = () => {
const {
  isAuthModalOpen,
  authModalMode,
  closeAuthModal,
  login,
  register,
  verifyEmail,
} = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode || 'login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
const [isVerificationStep, setIsVerificationStep] = useState(false);
const [verificationCode, setVerificationCode] = useState('');
const [pendingEmail, setPendingEmail] = useState('');
  // Sync mode and clear errors/inputs when modal opens or switches mode
  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
    }
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setCompany('');
    setPhone('');
    setError(null);
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
  };

  const handleClose = () => {
    resetFormFields();
    closeAuthModal();
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    if (isVerificationStep) {
      await verifyEmail(pendingEmail, verificationCode);
      resetFormFields();
      setVerificationCode('');
      setPendingEmail('');
      setIsVerificationStep(false);
      return;
    }

    if (mode === 'login') {
      await login(email, password);
      resetFormFields();
    } else {
      const result = await register({
        name,
        email,
        password,
        company,
        phone,
      });

      if (result.requiresVerification) {
        setPendingEmail(result.email);
        setIsVerificationStep(true);
        setVerificationCode('');
        return;
      }
    }
  } catch (err: any) {
    setError(err.message || 'Authentication failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">
            {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Access your personal consignments, real-time shipment map, and official waybills.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

       <form onSubmit={handleSubmit} className="space-y-3 text-xs">
  {isVerificationStep ? (
    <>
      <div className="text-center mb-4">
        <Mail className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <h3 className="text-white font-bold text-base">Verify your email</h3>
        <p className="text-slate-400 mt-2">
          Enter the six-digit verification code sent to {pendingEmail}.
        </p>
      </div>

      <div>
        <label className="text-slate-300 font-medium block mb-1">
          Verification Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={verificationCode}
          onChange={(e) =>
            setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
          }
          required
          placeholder="Enter 6-digit code"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-center text-xl tracking-[0.5em] text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || verificationCode.length !== 6}
        className="w-full py-2.5 mt-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </button>

<button
  type="button"
  disabled={loading}
  onClick={async () => {
    setLoading(true);
    setError(null);
    try {
      await api.auth.resendVerification(pendingEmail);
      setError('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code.');
    } finally {
      setLoading(false);
    }
  }}
  className="w-full py-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
>
  Resend verification code
</button>
      <button
        type="button"
        onClick={() => {
          setIsVerificationStep(false);
          setVerificationCode('');
          setError(null);
        }}
        className="w-full py-2 text-slate-400 hover:text-white"
      >
        Back to registration
      </button>
    </>
  ) : (
    <>
      {mode === 'register' && (
        <>
          <div>
            <label className="text-slate-300 font-medium block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. John Doe"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Company / Organization (Optional)</label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Logistics Ltd"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-slate-300 font-medium block mb-1">Email Address</label>
        <div className="relative">
          <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@domain.com"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div>
        <label className="text-slate-300 font-medium block mb-1">Password</label>
        <div className="relative">
          <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 mt-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
      >
        {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </>
  )}
</form>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <p>
              Need a new customer account?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className="text-cyan-400 font-semibold hover:underline"
              >
                Register
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className="text-cyan-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};