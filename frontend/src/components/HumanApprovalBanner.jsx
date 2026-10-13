import React from 'react';
import { ShieldAlert, UserCheck } from 'lucide-react';

export default function HumanApprovalBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start sm:items-center justify-between gap-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
            AI Advisory System &bull; Human-In-The-Loop Mandatory
          </h4>
          <p className="text-xs text-amber-300/80 mt-0.5">
            ReviewGuard never auto-merges or auto-approves PRs. All findings and summaries are strictly advisory recommendations for human engineers.
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 shrink-0">
        <UserCheck className="w-4 h-4" />
        Human Reviewer Required
      </div>
    </div>
  );
}
