import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchReviewDetail } from '@/services/api';
import FindingCard from '@/components/FindingCard';
import HumanApprovalBanner from '@/components/HumanApprovalBanner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ReviewDetails() {
  const { id } = useParams<{ id: string }>();

  const {
    data: review,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['review', id],
    queryFn: () => fetchReviewDetail(id as string),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-6 w-36 bg-slate-800" />
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
          <Skeleton className="h-8 w-1/2 bg-slate-800" />
          <Skeleton className="h-4 w-1/3 bg-slate-800" />
        </Card>
        <Card className="bg-[#111827] border-slate-800 p-6 space-y-3">
          <Skeleton className="h-6 w-48 bg-slate-800" />
          <Skeleton className="h-20 w-full bg-slate-800" />
        </Card>
      </div>
    );
  }

  if (error || !review) {
    const errorMsg = error instanceof Error ? error.message : 'Review not found';
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-400 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { summary, findings = [], suppressed_findings = [] } = review;
  const dist = summary?.severity_distribution || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header Info */}
      <Card className="bg-[#111827] border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                {review.repository}
              </Badge>
              {review.pr_number && (
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  PR #{review.pr_number}
                </span>
              )}
              {review.commit_sha && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                  {review.commit_sha.slice(0, 7)}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {review.pr_title || `Review ${review.id.slice(0, 8)}`}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Reviewed in {summary?.review_duration_ms ?? 0} ms
              </span>
              <span>&bull;</span>
              <span>Engine: {summary?.engine_used ?? 'standard'}</span>
              <span>&bull;</span>
              <span>{summary?.files_changed_count ?? 0} files changed</span>
            </div>
          </div>

          {/* Severity badges header */}
          <div className="flex items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-rose-300 block uppercase">Critical</span>
              <span className="text-lg font-bold text-white">{dist.CRITICAL ?? 0}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-orange-300 block uppercase">High</span>
              <span className="text-lg font-bold text-white">{dist.HIGH ?? 0}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-amber-300 block uppercase">Medium</span>
              <span className="text-lg font-bold text-white">{dist.MEDIUM ?? 0}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-blue-300 block uppercase">Low</span>
              <span className="text-lg font-bold text-white">{dist.LOW ?? 0}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Human approval alert */}
      <HumanApprovalBanner />

      {/* Review Executive Summary Card */}
      <Card className="bg-[#111827] border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ReviewGuard Executive Summary
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {summary?.summary_text}
        </p>

        {summary?.key_concerns && summary.key_concerns.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Primary Concerns
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {summary.key_concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&bull;</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Findings Tabs: Active vs Suppressed Duplicates */}
      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger
              value="active"
              className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Active Findings ({findings.length})
            </TabsTrigger>
            <TabsTrigger
              value="suppressed"
              className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Suppressed Duplicates ({suppressed_findings.length})
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-slate-400 hidden sm:block">
            Ranked by severity and calibrated by objective AST + AI rules
          </div>
        </div>

        {/* Tab Content: Active */}
        <TabsContent value="active" className="space-y-4 mt-0">
          {findings.length === 0 ? (
            <Card className="p-12 text-center bg-[#111827] border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-white">Clean Diff - No Issues Detected</h4>
              <p className="text-xs text-slate-400 mt-1">
                Static AST and AI analysis verified the changed lines without actionable bugs or vulnerabilities.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Suppressed */}
        <TabsContent value="suppressed" className="space-y-4 mt-0">
          {suppressed_findings.length === 0 ? (
            <Card className="p-12 text-center bg-[#111827] border-slate-800">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-white">No Duplicates Suppressed</h4>
              <p className="text-xs text-slate-400 mt-1">
                All identified findings in this PR were distinct and unique.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                💡 <strong>Deduplication Engine Active:</strong> These findings were identified during AST / AI analysis but clustered and suppressed because they overlap with higher-priority primary findings.
              </div>
              {suppressed_findings.map((f) => (
                <FindingCard key={f.id} finding={f} isSuppressed={true} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
