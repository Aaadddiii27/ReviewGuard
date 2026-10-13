import React from 'react';
import { ShieldCheck, Play, Github, Cpu, ExternalLink } from 'lucide-react';

export default function Navbar({ onTriggerClick }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">ReviewGuard</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0 Hackathon
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Autonomous AI PR Reviewer &bull; Diff-Aware &amp; Deduplicated</p>
          </div>
        </div>

        {/* Engine status & actions */}
        <div className="flex items-center gap-3">
          {/* Active Model pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">qwen2.5-coder (NVIDIA GPU)</span>
          </div>

          <button
            onClick={onTriggerClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Trigger Review</span>
          </button>
        </div>
      </div>
    </header>
  );
}
