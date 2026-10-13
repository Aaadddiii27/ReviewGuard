import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitPullRequest, Search, BarChart3, Award, Settings, Shield } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Pull Requests', path: '/pulls', icon: GitPullRequest },
  { label: 'Findings Explorer', path: '/findings', icon: Search },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Benchmark & Metrics', path: '/benchmark', icon: Award },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0d121f] border-r border-slate-800/80 flex flex-col shrink-0 min-h-[calc(100vh-65px)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Advisory card in bottom sidebar */}
      <div className="mt-auto p-4 m-3 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
          <Shield className="w-4 h-4 text-emerald-400" />
          ReviewGuard Core
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Diff-aware AST + AI pipeline with duplicate suppression. Senior human signoff remains mandatory.
        </p>
      </div>
    </aside>
  );
}
