import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Zap, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LockScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const result = login(password.trim());
    if (!result.success) {
      setErrorMsg(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } else {
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/95 backdrop-blur-xl p-4 font-sans selection:bg-amber-500 selection:text-black">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full max-w-md bg-dark-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 transition-transform ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Brand Lock Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 shadow-xl shadow-amber-500/20 mb-1">
            <Lock className="w-8 h-8 text-black" />
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
                VOLT POS SYSTEM
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Terminal Locked • Authentication Required
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Enter Store Access Password
              </span>
              <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                Default: admin123
              </span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter password..."
                className="w-full glass-input px-4 py-3.5 pr-12 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-amber-500/50"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Warning Badge */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center space-x-2 group"
          >
            <span>UNLOCK TERMINAL</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Cloud & Offline Authentication Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
