import React, { useState, useEffect } from 'react';
import { Place, CommunityReport } from '../types/accessibility';
import { AdminPanel } from './AdminPanel';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowLeft, 
  KeyRound, 
  SlidersHorizontal, 
  LogOut, 
  Globe, 
  Sparkles, 
  AlertCircle,
  Eye,
  EyeOff,
  Server
} from 'lucide-react';

interface AdminPortalProps {
  places: Place[];
  reports: CommunityReport[];
  onPlacesUpdated: (updated: Place[]) => void;
  onReportsUpdated: (updated: CommunityReport[]) => void;
  onOpenAddPlace: () => void;
  onExitToPublic: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  places,
  reports,
  onPlacesUpdated,
  onReportsUpdated,
  onOpenAddPlace,
  onExitToPublic,
  highContrast,
  onToggleContrast,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = sessionStorage.getItem('accessmap_admin_auth');
      const local = localStorage.getItem('accessmap_admin_auth');
      return session === 'true' || local === 'true';
    } catch {
      return false;
    }
  });

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to top when switching views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setIsAuthenticated(true);
        if (rememberMe) {
          localStorage.setItem('accessmap_admin_auth', 'true');
        } else {
          sessionStorage.setItem('accessmap_admin_auth', 'true');
        }
      } else {
        // Fallback for default demo credential
        if (username.trim() === 'admin' && (password === 'admin123' || password === 'admin')) {
          setIsAuthenticated(true);
          if (rememberMe) {
            localStorage.setItem('accessmap_admin_auth', 'true');
          } else {
            sessionStorage.setItem('accessmap_admin_auth', 'true');
          }
        } else {
          setLoginError(data?.error || 'Invalid credentials. Default is: admin / admin123');
        }
      }
    } catch {
      // Offline / fallback verification
      if (username.trim() === 'admin' && (password === 'admin123' || password === 'admin')) {
        setIsAuthenticated(true);
        sessionStorage.setItem('accessmap_admin_auth', 'true');
      } else {
        setLoginError('Authentication failed. Default demo credentials are admin / admin123');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setUsername('admin');
    setPassword('admin123');
    setIsAuthenticated(true);
    sessionStorage.setItem('accessmap_admin_auth', 'true');
    setLoginError(null);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('accessmap_admin_auth');
      localStorage.removeItem('accessmap_admin_auth');
    } catch {}
    setIsAuthenticated(false);
    setPassword('');
  };

  // --- 1. Restricted Login View if not Authenticated ---
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-between transition-colors ${
        highContrast ? 'bg-black text-white' : 'bg-[#EDE8F5] text-[#1E2548]'
      }`}>
        {/* Top Minimal Admin Nav */}
        <header className={`border-b px-6 py-4 flex items-center justify-between ${
          highContrast ? 'bg-black border-yellow-400' : 'bg-white/90 backdrop-blur-md border-[#ADBBDA]/60 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E2548] text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#7091E6]" />
            </div>
            <div>
              <span className="text-base font-bold text-[#1E2548] block leading-tight">
                AccessMap Administration
              </span>
              <span className="text-xs text-[#8697C4] font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Restricted URL: <code>/admin</code></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleContrast}
              className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-[#EDE8F5] text-[#3D52A0] border-[#ADBBDA]/70 hover:bg-[#ADBBDA]/30'
              }`}
              title="Toggle High Contrast"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={onExitToPublic}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#ADBBDA]/80 text-[#3D52A0] hover:bg-white hover:text-[#1E2548] transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Public App</span>
            </button>
          </div>
        </header>

        {/* Center Login Box */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl border transition-all ${
            highContrast
              ? 'bg-black text-white border-yellow-400'
              : 'bg-white border-[#ADBBDA]/80'
          }`}>
            <div className="text-center space-y-2 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E2548] to-[#3D52A0] text-white flex items-center justify-center mx-auto shadow-md border border-[#7091E6]/40">
                <Lock className="w-7 h-7 text-[#ADBBDA]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE8F5] text-[#3D52A0] text-xs font-bold mt-2">
                <KeyRound className="w-3.5 h-3.5 text-[#7091E6]" />
                <span>Dedicated Admin Portal URL</span>
              </div>
              <h1 className="text-2xl font-black text-[#1E2548] tracking-tight">
                Admin Sign-In
              </h1>
              <p className="text-xs text-[#8697C4]">
                This administrative section is isolated from the main consumer app. Sign in to moderate community reports and manage venues.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E2548] mb-1.5">
                  Administrator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8697C4] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#ADBBDA]/70 text-xs sm:text-sm text-[#1E2548] focus:ring-2 focus:ring-[#7091E6] focus:border-[#7091E6] focus:outline-none bg-[#EDE8F5]/30 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2548] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8697C4] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#ADBBDA]/70 text-xs sm:text-sm text-[#1E2548] focus:ring-2 focus:ring-[#7091E6] focus:border-[#7091E6] focus:outline-none bg-[#EDE8F5]/30 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8697C4] hover:text-[#1E2548]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#3D52A0] font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#3D52A0] focus:ring-[#7091E6]"
                  />
                  <span>Keep session active</span>
                </label>
                <span className="text-[#8697C4] text-[11px]">
                  Default: <span className="font-mono font-bold text-[#3D52A0]">admin123</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E2548] hover:bg-[#3D52A0] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer min-h-[42px]"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#7091E6]" />
                    <span>Enter Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick 1-Click Access for Convenience */}
            <div className="mt-5 pt-4 border-t border-[#ADBBDA]/40 space-y-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="w-full py-2 px-3 rounded-xl bg-[#EDE8F5] hover:bg-[#ADBBDA]/40 text-[#3D52A0] font-bold text-xs transition-all flex items-center justify-center gap-2 border border-[#ADBBDA]/60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7091E6]" />
                <span>1-Click Demo Login (admin / admin123)</span>
              </button>

              <button
                type="button"
                onClick={onExitToPublic}
                className="w-full py-2 px-3 text-[#8697C4] hover:text-[#1E2548] text-xs font-semibold text-center block transition-colors"
              >
                ← Return to Public AccessMap App
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="text-center py-4 text-xs text-[#8697C4] border-t border-[#ADBBDA]/40">
          AccessMap Secure Management System • Isolated Route <code>/admin</code>
        </footer>
      </div>
    );
  }

  // --- 2. Authenticated Dedicated Admin Portal View ---
  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      highContrast ? 'bg-black text-white' : 'bg-[#EDE8F5] text-[#1E2548]'
    }`}>
      {/* Dedicated Standalone Admin Header */}
      <header className={`sticky top-0 z-30 transition-colors border-b ${
        highContrast 
          ? 'bg-black text-white border-yellow-400' 
          : 'bg-[#1E2548] text-white border-[#3D52A0]/80 shadow-md'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Admin Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D52A0] text-white flex items-center justify-center font-bold shadow-inner border border-[#7091E6]/40 shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#EDE8F5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white leading-tight">
                  AccessMap Admin Portal
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Live Mode
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#ADBBDA]">
                <span className="font-mono text-[11px] bg-white/10 px-1.5 py-0.5 rounded">
                  URL: /admin
                </span>
                <span className="hidden md:inline">• Dedicated Management Plane</span>
              </div>
            </div>
          </div>

          {/* Admin Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleContrast}
              title="High Contrast Mode"
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 border ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Contrast</span>
            </button>

            {/* Exit to Public App */}
            <button
              onClick={onExitToPublic}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/20 min-h-[38px]"
              title="Return to the client-facing public map and places"
            >
              <Globe className="w-3.5 h-3.5 text-[#ADBBDA]" />
              <span className="hidden sm:inline">View Public App</span>
              <span className="sm:hidden">Public</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-500/30 min-h-[38px]"
              title="Sign out of Admin Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Session Notification Bar */}
      <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
        highContrast
          ? 'bg-black text-yellow-400 border-yellow-400'
          : 'bg-[#3D52A0] text-[#EDE8F5] border-[#1E2548]'
      }`}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2 font-medium">
            <Server className="w-3.5 h-3.5 text-[#7091E6]" />
            <span>Administrator Session active as <strong>admin (Superuser)</strong></span>
          </div>
          <button
            onClick={onExitToPublic}
            className="hover:underline text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>← Exit Admin & Go to Main App</span>
          </button>
        </div>
      </div>

      {/* Main Admin Content: Full Management Dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-12">
        <AdminPanel
          places={places}
          reports={reports}
          onPlacesUpdated={onPlacesUpdated}
          onReportsUpdated={onReportsUpdated}
          onOpenAddPlace={onOpenAddPlace}
          highContrast={highContrast}
        />
      </main>

      {/* Dedicated Admin Footer */}
      <footer className={`border-t py-6 transition-colors ${
        highContrast ? 'bg-black text-white border-yellow-400' : 'bg-[#1E2548] text-[#ADBBDA] border-white/10'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7091E6]" />
            <span className="font-bold text-white">AccessMap Admin Portal</span>
            <span>• Protected Management Environment</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded">
              URL: /admin
            </span>
            <button
              onClick={onExitToPublic}
              className="text-white hover:text-[#7091E6] underline font-bold"
            >
              Back to Public Web App (/)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
