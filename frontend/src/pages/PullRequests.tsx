import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, ArrowRight, Filter, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchReviews } from '@/services/api';
import { Input } from '@/components/ui/input';
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

export default function PullRequests() {
  const [repoFilter, setRepoFilter] = useState('');

  const {
    data: reviews = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reviews', { limit: 100 }],
    queryFn: () => fetchReviews({ limit: 100 }),
  });

  const filtered = repoFilter
    ? reviews.filter((r) => r.repository.toLowerCase().includes(repoFilter.toLowerCase()))
    : reviews;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-emerald-400" />
            Pull Requests Ingestion Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete audit trail of all GitHub PRs processed by ReviewGuard.
          </p>
        </div>

        {/* Filter input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              placeholder="Filter by repo..."
              className="bg-slate-900 border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 w-60"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-1/3 bg-slate-800" />
                <Skeleton className="h-6 w-1/4 bg-slate-800" />
                <Skeleton className="h-6 w-16 bg-slate-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-300 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load pull requests. Please try refreshing.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No pull requests match your criteria.
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
                    Severity Distribution
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
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/80">
                {filtered.map((r) => {
                  const critCount = r.critical_count ?? 0;
                  const highCount = r.high_count ?? 0;
                  const medCount = r.medium_count ?? 0;
                  const lowCount = r.low_count ?? 0;

                  return (
                    <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/30 transition">
                      <TableCell className="px-6 py-4">
                        <div className="font-semibold text-white">{r.pr_title || `PR Review ${r.id.slice(0, 8)}`}</div>
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
                          {lowCount > 0 && (
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {lowCount} Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-slate-300">
                        {r.duplicates_suppressed ?? 0}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-slate-400">{r.duration_ms ?? 0} ms</TableCell>
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
                          View
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
