import React from 'react';
import {
  Shield,
  Bug,
  Zap,
  Sparkles,
  FileCode,
  AlertOctagon,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Finding } from '@/types';

interface FindingCardProps {
  finding: Finding;
  isSuppressed?: boolean;
}

export default function FindingCard({ finding, isSuppressed = false }: FindingCardProps) {
  const categoryIcons: Record<string, React.ReactNode> = {
    SECURITY: <Shield className="w-3.5 h-3.5 text-rose-400" />,
    BUG: <Bug className="w-3.5 h-3.5 text-amber-400" />,
    PERFORMANCE: <Zap className="w-3.5 h-3.5 text-blue-400" />,
    QUALITY: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    STYLE: <Sparkles className="w-3.5 h-3.5 text-slate-400" />,
  };

  const severityStyles: Record<string, string> = {
    CRITICAL: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    LOW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const severityIcon: Record<string, React.ReactNode> = {
    CRITICAL: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
    HIGH: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
    MEDIUM: <Info className="w-3.5 h-3.5 text-amber-400" />,
    LOW: <Info className="w-3.5 h-3.5 text-blue-400" />,
  };

  const confidencePct = Math.round((finding.confidence ?? 0.85) * 100);

  return (
    <Card
      className={`border rounded-xl transition-all duration-200 overflow-hidden ${
        isSuppressed
          ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
          : 'bg-[#111827]/90 border-slate-800 hover:border-slate-700 shadow-sm'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Header row: Badges and file/line */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity */}
            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${
                severityStyles[finding.severity] || severityStyles.MEDIUM
              }`}
            >
              {severityIcon[finding.severity]}
              {finding.severity}
            </Badge>

            {/* Category */}
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/80 text-slate-300 border-slate-700/60"
            >
              {categoryIcons[finding.category]}
              {finding.category}
            </Badge>

            {/* Source */}
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/40">
              {finding.source || 'AI'}
            </span>

            {/* Duplicate badge */}
            {isSuppressed && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 border-amber-500/20"
              >
                Suppressed Duplicate (
                {finding.similarity_score
                  ? `${Math.round(finding.similarity_score * 100)}% match`
                  : 'Clustered'}
                )
              </Badge>
            )}
          </div>

          {/* File location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-700/50">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{finding.file}</span>
            {finding.line && <span className="text-emerald-400 font-bold">:L{finding.line}</span>}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-base font-semibold text-white mb-2 leading-snug">{finding.title}</h4>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-300 mb-3.5 leading-relaxed">{finding.description}</p>

        {/* Impact and Action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3.5">
          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15">
            <span className="text-[11px] font-semibold text-rose-300 block mb-1">Impact &amp; Context</span>
            <p className="text-xs text-slate-300 leading-relaxed">{finding.why_it_matters}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <span className="text-[11px] font-semibold text-emerald-300 block mb-1">Recommended Action</span>
            <p className="text-xs text-slate-300 leading-relaxed">{finding.recommendation}</p>
          </div>
        </div>

        {/* Evidence code snippet */}
        {finding.evidence && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-900/90 px-3 py-1.5 rounded-t-lg border-t border-x border-slate-800">
              <span>Code Evidence</span>
            </div>
            <pre className="text-xs font-mono bg-slate-950 p-3 rounded-b-lg border border-slate-800 text-slate-200 overflow-x-auto">
              <code>{finding.evidence}</code>
            </pre>
          </div>
        )}

        {/* Footer info: Confidence & Fingerprint */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Confidence:</span>
            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-slate-300">{confidencePct}%</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <span>id:</span>
            <span className="text-slate-400">{finding.fingerprint || finding.id?.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
