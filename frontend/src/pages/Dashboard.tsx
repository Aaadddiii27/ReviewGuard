import React from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequest,
  AlertOctagon,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '@/components/StatCard';
import HumanApprovalBanner from '@/components/HumanApprovalBanner';
import { fetchAnalytics, fetchReviews } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface DashboardProps {
  onTriggerClick: () => void;
}

export default function Dashboard({ onTriggerClick }: DashboardProps) {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    error: reviewsError,
  } = useQuery({
    queryKey: ['reviews', { limit: 8 }],
    queryFn: () => fetchReviews({ limit: 8 }),
  });

  const loading = analyticsLoading || reviewsLoading;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Pull Request Review Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Diff-aware AI and static analysis alleviating the senior engineer PR review bottleneck.
          </p>
        </div>
        <Button
          onClick={onTriggerClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 self-start sm:self-auto"
        >
          <Zap className="w-4 h-4" />
          Trigger Review
        </Button>
      </div>

      {/* Human in the loop banner */}
      <HumanApprovalBanner />

      {/* Metric Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111827]/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <Skeleton className="h-4 w-28 bg-slate-800" />
              <Skeleton className="h-8 w-20 bg-slate-800" />
              <Skeleton className="h-3 w-36 bg-slate-800" />
            </div>
          ))}
        </div>
      ) : analyticsError ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load overview analytics. The backend may still be synchronizing.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total PRs Reviewed"
            value={analytics?.total_reviews || 0}
            subtitle="Processed via diff-aware engine"
            icon={GitPullRequest}
            color="emerald"
          />
          <StatCard
            title="Critical Vulnerabilities"
            value={analytics?.severity_distribution?.CRITICAL || 0}
            subtitle="RCE, SQLi, Buffer Overflows"
            icon={AlertOctagon}
            color="rose"
          />
          <StatCard
            title="Duplicates Suppressed"
            value={analytics?.duplicates_suppressed || 0}
            trend={`${analytics?.suppression_rate_pct || 0}% suppressed`}
            subtitle="Redundant nitpicks merged"
            icon={Layers}
            color="purple"
          />
          <StatCard
            title="Review Latency"
            value={`${analytics?.avg_latency_ms || 2100} ms`}
            subtitle={`Saved ~${analytics?.estimated_hours_saved || 0} senior eng hours`}
            icon={Clock}
            color="blue"
          />
        </div>
      )}

      {/* Severity Breakdown Bar */}
      {analytics && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Overall Severity Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-xs font-semibold text-rose-300 block">CRITICAL</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {analytics.severity_distribution?.CRITICAL || 0}
              </span>
              <span className="text-[11px] text-slate-400">Immediate blockers</span>
            </div>
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-xs font-semibold text-orange-300 block">HIGH</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {analytics.severity_distribution?.HIGH || 0}
              </span>
              <span className="text-[11px] text-slate-400">Security &amp; bugs</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-semibold text-amber-300 block">MEDIUM</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {analytics.severity_distribution?.MEDIUM || 0}
              </span>
              <span className="text-[11px] text-slate-400">Edge cases &amp; logic</span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs font-semibold text-blue-300 block">LOW</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {analytics.severity_distribution?.LOW || 0}
              </span>
              <span className="text-[11px] text-slate-400">Style &amp; readability</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reviews Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Pull Request Reviews</h3>
            <p className="text-xs text-slate-400">Audited diffs with line-level findings and duplicate suppression</p>
          </div>
          <Link
            to="/pulls"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {reviewsLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-1/3 bg-slate-800" />
                <Skeleton className="h-6 w-1/4 bg-slate-800" />
                <Skeleton className="h-6 w-16 bg-slate-800" />
              </div>
            ))}
          </div>
        ) : reviewsError ? (
          <div className="p-8 text-center text-rose-300 text-xs">
            Failed to load reviews.
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white">No reviews recorded yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Trigger your first review using the preset buttons or paste a Git diff to see ReviewGuard in action.
            </p>
            <Button
              onClick={onTriggerClick}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition"
            >
              Start Review
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    Pull Request / Repository
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    Severity Counts
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    Suppressed
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    Latency
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    Engine
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-slate-400 uppercase tracking-wider font-semibold text-[11px] text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/80">
                {reviews.map((r) => {
                  const critCount = r.critical_count ?? 0;
                  const highCount = r.high_count ?? 0;
                  const medCount = r.medium_count ?? 0;
                  const suppressedCount = r.duplicates_suppressed ?? 0;

                  return (
                    <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/30 transition">
                      <TableCell className="px-6 py-4">
                        <div className="font-semibold text-white">{r.pr_title || `Review ${r.id.slice(0, 8)}`}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {r.repository} {r.pr_number ? `• PR #${r.pr_number}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {critCount > 0 && (
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-400 border-rose-500/20">
                              {critCount} Crit
                            </Badge>
                          )}
                          {highCount > 0 && (
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold bg-orange-500/10 text-orange-400 border-orange-500/20">
                              {highCount} High
                            </Badge>
                          )}
                          {medCount > 0 && (
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border-amber-500/20">
                              {medCount} Med
                            </Badge>
                          )}
                          {critCount === 0 && highCount === 0 && medCount === 0 && (
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Clean
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="font-mono text-slate-300">
                          {suppressedCount} {suppressedCount === 1 ? 'item' : 'items'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-slate-400">
                        {r.duration_ms ?? 0} ms
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="secondary" className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border-0">
                          {r.engine_used || 'ollama'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Link
                          to={`/reviews/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                        >
                          Inspect
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
