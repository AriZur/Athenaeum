import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Library,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError('Please provide your email address and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message || 'Unable to sign in. Please verify your email and password.');
        }
      } else {
        const { error: signUpErr } = await signUp(email, password, name);
        if (signUpErr) {
          setError(signUpErr.message || 'Unable to create account. Please try again.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] flex flex-col justify-between text-[#434338] px-4 py-8 sm:py-12 selection:bg-[#efede4] selection:text-[#5A5A40]">
      {/* Top Brand Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#e2e0d5]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-[#2d2d26]">
                Athenaeum
              </span>
            </div>
            <p className="text-xs text-[#8c8c7d]">Circulation & Inventory Management</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8c8c7d]">
          <Library className="w-4 h-4 text-[#5A5A40]" />
          <span className="font-medium text-[11px]">Database Connected</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#e2e0d5] shadow-xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#efede4] text-[#5A5A40] mx-auto flex items-center justify-center">
              {mode === 'signin' ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#2d2d26]">
              {mode === 'signin' ? 'Sign In to Your Account' : 'Create a New Account'}
            </h1>
            <p className="text-xs text-[#8c8c7d] leading-relaxed max-w-sm mx-auto">
              {mode === 'signin'
                ? 'Sign in to access your circulation dashboard, catalog collections, and borrower records.'
                : 'Register a new library management account to start managing books, members, and loans.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-[#f8f7f2] p-1 rounded-2xl border border-[#e2e0d5]">
            <button
              id="signin-tab-btn"
              type="button"
              onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                mode === 'signin' 
                  ? 'bg-white text-[#2d2d26] shadow-xs' 
                  : 'text-[#8c8c7d] hover:text-[#2d2d26]'
              }`}
            >
              Sign In
            </button>
            <button
              id="signup-tab-btn"
              type="button"
              onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                mode === 'signup' 
                  ? 'bg-white text-[#2d2d26] shadow-xs' 
                  : 'text-[#8c8c7d] hover:text-[#2d2d26]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block font-semibold text-[#434338] mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#8c8c7d]" />
                  <span>Full Name</span>
                </label>
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#434338] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8c8c7d]" />
                <span>Email Address</span>
              </label>
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#434338] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8c8c7d]" />
                <span>Password {mode === 'signup' && <span className="text-[#8c8c7d] font-normal">(min 6 characters)</span>}</span>
              </label>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 pr-10 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
                />
                <button
                  id="toggle-login-password-btn"
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
                <label className="block font-semibold text-[#434338] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8c8c7d]" />
                  <span>Confirm Password</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full p-2.5 pr-10 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
                  />
                  <button
                    id="toggle-signup-confirm-password-btn"
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
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                'Processing...'
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-[#8c8c7d] pt-6 border-t border-[#e2e0d5]">
        <span className="font-serif font-bold text-[#2d2d26]">Athenaeum</span>
        <span className="mx-2">•</span>
        <span>Secure Account & Data Persistence</span>
      </footer>
    </div>
  );
};
