import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Play, Cpu, Menu, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAuthToken, clearAuthToken, fetchUserProfile } from '@/services/api';

interface NavbarProps {
  onTriggerClick: () => void;
  onMenuClick?: () => void;
}

export default function Navbar({ onTriggerClick, onMenuClick }: NavbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchUserProfile()
        .then((res) => {
          if (res?.user?.email) setUserEmail(res.user.email);
        })
        .catch(() => {
          // Token invalid or expired
          clearAuthToken();
          setUserEmail(null);
        });
    }
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setUserEmail(null);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Brand & Mobile menu */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/20 group-hover:border-emerald-500/50 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition">
                  ReviewGuard
                </span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  v1.0
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous AI PR Reviewer &bull; Diff-Aware &amp; Deduplicated
              </p>
            </div>
          </Link>
        </div>

        {/* Engine status & actions */}
        <div className="flex items-center gap-3">
          {/* Active Model pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">qwen2.5-coder (NVIDIA GPU)</span>
          </div>

          {userEmail ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-mono text-[11px] max-w-[140px] truncate">{userEmail}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 hover:bg-slate-900 h-8 px-2"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hover:bg-slate-800/80">
                Sign In
              </Button>
            </Link>
          )}

          <Button
            onClick={onTriggerClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Trigger Review</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
