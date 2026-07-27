import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Zap, KeyRound, ArrowRight, AlertCircle, Shield, UserCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LockScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your username (admin or staff).');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const result = login(username.trim(), password.trim());
    if (!result.success) {
      setErrorMsg(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } else {
      setErrorMsg('');
    }
  };

  const handleQuickSelect = (roleName, defaultPass) => {
    setUsername(roleName);
    setPassword(defaultPass);
    setErrorMsg('');
    const result = login(roleName, defaultPass);
    if (!result.success) {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/95 backdrop-blur-md p-4 font-sans selection:bg-teal-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full max-w-md bg-[#273549] border border-[#374151] rounded-3xl p-8 shadow-xl space-y-6 relative z-10 transition-transform ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Brand Lock Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#14B8A6] shadow-sm mb-1">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5 text-[#14B8A6] fill-[#14B8A6]" />
              <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
                VOLT POS SYSTEM
              </h2>
            </div>
            <p className="text-xs text-[#9CA3AF] font-mono mt-1">
              Select User Role or Enter Credentials to Sign In
            </p>
          </div>
        </div>

        {/* Quick Role Selection Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleQuickSelect('admin', 'admin123')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between group ${
              username === 'admin' 
                ? 'bg-amber-500/10 border-amber-500/30 text-[#F3F4F6]' 
                : 'bg-[#1F2937] border-[#374151] text-[#9CA3AF] hover:border-teal-500/40 hover:bg-[#1F2937]/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <Shield className={`w-5 h-5 ${username === 'admin' ? 'text-amber-400' : 'text-[#9CA3AF] group-hover:text-amber-400'}`} />
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">SHOP OWNER</span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-xs text-[#F3F4F6]">Admin Portal</div>
              <div className="text-[10px] text-[#9CA3AF] font-mono">User: admin</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect('staff', 'staff123')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between group ${
              username === 'staff' 
                ? 'bg-teal-500/10 border-teal-500/30 text-[#F3F4F6]' 
                : 'bg-[#1F2937] border-[#374151] text-[#9CA3AF] hover:border-teal-500/40 hover:bg-[#1F2937]/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <UserCheck className={`w-5 h-5 ${username === 'staff' ? 'text-[#14B8A6]' : 'text-[#9CA3AF] group-hover:text-[#14B8A6]'}`} />
              <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-500/20">CASHIER</span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-xs text-[#F3F4F6]">Staff Portal</div>
              <div className="text-[10px] text-[#9CA3AF] font-mono">User: staff</div>
            </div>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#9CA3AF] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#14B8A6]" /> Username
              </span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter username (admin or staff)..."
              className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500/20 border-[#374151]"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#9CA3AF] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#14B8A6]" /> Password
              </span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter password..."
                className="w-full glass-input px-4 py-3 pr-12 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-teal-500/20 border-[#374151]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#9CA3AF] hover:text-[#F3F4F6] transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Warning Badge */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-sm shadow-sm transition flex items-center justify-center space-x-2 group"
          >
            <span>SIGN IN TO PORTAL</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-[#374151] text-center">
          <div className="text-[11px] text-[#9CA3AF] font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dual-Role Authentication System Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
