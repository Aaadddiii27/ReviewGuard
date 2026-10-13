import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitPullRequest, ExternalLink, ShieldCheck, Clock, Layers, FileCode, CheckCircle2 } from 'lucide-react';
import { fetchReviewDetail } from '../services/api';
import FindingCard from '../components/FindingCard';
import HumanApprovalBanner from '../components/HumanApprovalBanner';

export default function ReviewDetails() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'suppressed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchReviewDetail(id);
        setReview(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading review analysis...
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          {error || 'Review not found'}
        </div>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-400 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { summary, findings, suppressed_findings } = review;
  const dist = summary.severity_distribution;

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
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {review.repository}
              </span>
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
                Reviewed in {summary.review_duration_ms} ms
              </span>
              <span>&bull;</span>
              <span>Engine: {summary.engine_used}</span>
              <span>&bull;</span>
              <span>{summary.files_changed_count} files changed</span>
            </div>
          </div>

          {/* Severity badges header */}
          <div className="flex items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-rose-300 block uppercase">Critical</span>
              <span className="text-lg font-bold text-white">{dist.CRITICAL}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-orange-300 block uppercase">High</span>
              <span className="text-lg font-bold text-white">{dist.HIGH}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-amber-300 block uppercase">Medium</span>
              <span className="text-lg font-bold text-white">{dist.MEDIUM}</span>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 min-w-[70px]">
              <span className="text-[10px] font-bold text-blue-300 block uppercase">Low</span>
              <span className="text-lg font-bold text-white">{dist.LOW}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Human approval alert */}
      <HumanApprovalBanner />

      {/* Review Executive Summary Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ReviewGuard Executive Summary
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {summary.summary_text}
        </p>

        {summary.key_concerns?.length > 0 && (
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
      </div>

      {/* Findings Tabs: Active vs Suppressed Duplicates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              Active Findings ({findings.length})
            </button>
            <button
              onClick={() => setActiveTab('suppressed')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'suppressed'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Suppressed Duplicates ({suppressed_findings.length})
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            {activeTab === 'active'
              ? 'Ranked by severity and calibrated by objective rules'
              : 'Substantially overlapping findings consolidated to reduce review fatigue'}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'active' ? (
          findings.length === 0 ? (
            <div className="p-12 text-center bg-[#111827] border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-white">Clean Diff - No Issues Detected</h4>
              <p className="text-xs text-slate-400 mt-1">
                Static AST and AI analysis verified the changed lines without actionable bugs or vulnerabilities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )
        ) : suppressed_findings.length === 0 ? (
          <div className="p-12 text-center bg-[#111827] border border-slate-800 rounded-2xl">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-white">No Duplicates Suppressed</h4>
            <p className="text-xs text-slate-400 mt-1">
              All identified findings in this PR were distinct and unique.
            </p>
          </div>
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
      </div>
    </div>
  );
}
