import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, AlertOctagon, AlertTriangle, Layers, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import StatCard from '../components/StatCard';
import HumanApprovalBanner from '../components/HumanApprovalBanner';
import { fetchAnalytics, fetchReviews } from '../services/api';

export default function Dashboard({ onTriggerClick }) {
  const [analytics, setAnalytics] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, reviewsData] = await Promise.all([
        fetchAnalytics(),
        fetchReviews({ limit: 8 })
      ]);
      setAnalytics(analyticsData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        <button
          onClick={onTriggerClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 transition self-start sm:self-auto"
        >
          <Zap className="w-4 h-4" />
          Test Diff Review
        </button>
      </div>

      {/* Human in the loop banner */}
      <HumanApprovalBanner />

      {/* Metric Cards Grid */}
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

        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white">No reviews recorded yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Trigger your first review using the preset buttons or paste a Git diff to see ReviewGuard in action.
            </p>
            <button
              onClick={onTriggerClick}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition"
            >
              Run Test Review
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Pull Request / Repository</th>
                  <th className="px-6 py-3.5">Severity Counts</th>
                  <th className="px-6 py-3.5">Suppressed</th>
                  <th className="px-6 py-3.5">Latency</th>
                  <th className="px-6 py-3.5">Engine</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{r.pr_title || `Review ${r.id.slice(0, 8)}`}</div>
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
                        {r.critical_count === 0 && r.high_count === 0 && r.medium_count === 0 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Clean
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-300">
                        {r.duplicates_suppressed} {r.duplicates_suppressed === 1 ? 'item' : 'items'}
                      </span>
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
                        Inspect
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
