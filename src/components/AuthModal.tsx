import React, { useState } from 'react';
import { LogIn, UserPlus, User, ShieldCheck, AlertCircle, CheckCircle2, Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInDemoAdmin } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message || 'Authentication failed. Please verify credentials.');
        } else {
          onClose();
        }
      } else {
        const { error: signUpErr } = await signUp(email, password, name);
        if (signUpErr) {
          setError(signUpErr.message || 'Registration failed.');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    signInDemoAdmin();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5">
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#2d2d26]">
                {mode === 'signin' ? 'Account Sign In' : 'Create New Account'}
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Manage library collections, loans, and memberships.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c7d] hover:text-[#2d2d26] font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Demo Fast Track Button */}
        <div className="p-3.5 bg-[#efede4] rounded-2xl border border-[#e2e0d5] flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-[#5A5A40] block">Quick Demo Login</span>
            <span className="text-[11px] text-[#434338]">Explore with demo privileges</span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Demo Access
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-xs font-semibold border-b border-[#f0eee4] pb-2">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`pb-1 border-b-2 transition-colors uppercase tracking-wider text-[11px] cursor-pointer ${
              mode === 'signin' ? 'border-[#5A5A40] text-[#5A5A40] font-bold' : 'border-transparent text-[#8c8c7d] hover:text-[#2d2d26]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`pb-1 border-b-2 transition-colors uppercase tracking-wider text-[11px] cursor-pointer ${
              mode === 'signup' ? 'border-[#5A5A40] text-[#5A5A40] font-bold' : 'border-transparent text-[#8c8c7d] hover:text-[#2d2d26]'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block font-semibold text-[#434338] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8c8c7d]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#434338] mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#8c8c7d]" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#434338] mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#8c8c7d]" />
              <span>Password {mode === 'signup' && <span className="text-[#8c8c7d] font-normal">(min 6 chars)</span>}</span>
            </label>
            <div className="relative">
              <input
                id="auth-modal-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 pr-10 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              />
              <button
                id="toggle-auth-modal-password-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-lg transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'View password'}
                aria-label={showPassword ? 'Hide password' : 'View password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block font-semibold text-[#434338] mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8c8c7d]" />
                <span>Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  id="auth-modal-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 pr-10 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
                />
                <button
                  id="toggle-auth-modal-confirm-password-btn"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-lg transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'View password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
