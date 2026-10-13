import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, ArrowRight, ShieldCheck, Filter } from 'lucide-react';
import { fetchReviews } from '../services/api';

export default function PullRequests() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchReviews({ limit: 100 });
        setReviews(data);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
            <input
              type="text"
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              placeholder="Filter by repo..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading pull requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No pull requests match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Pull Request / Repository</th>
                  <th className="px-6 py-3.5">Severity Distribution</th>
                  <th className="px-6 py-3.5">Suppressed</th>
                  <th className="px-6 py-3.5">Latency</th>
                  <th className="px-6 py-3.5">Engine</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{r.pr_title || `PR Review ${r.id.slice(0, 8)}`}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.repository} {r.pr_number ? `• PR #${r.pr_number}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {r.critical_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {r.critical_count} Crit
                          </span>
                        )}
                        {r.high_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            {r.high_count} High
                          </span>
                        )}
                        {r.medium_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {r.medium_count} Med
                          </span>
                        )}
                        {r.low_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {r.low_count} Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {r.duplicates_suppressed}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{r.duration_ms} ms</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {r.engine_used || 'ollama'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/reviews/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
