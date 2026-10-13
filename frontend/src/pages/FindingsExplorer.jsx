import React, { useEffect, useState } from 'react';
import { Search, Shield, Bug, Zap, Sparkles, Filter } from 'lucide-react';
import { fetchFindings } from '../services/api';
import FindingCard from '../components/FindingCard';

export default function FindingsExplorer() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const params = {};
        if (category) params.category = category;
        if (severity) params.severity = severity;
        if (status) params.status = status;
        const data = await fetchFindings(params);
        setFindings(data);
      } catch (err) {
        console.error('Failed to load findings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, severity, status]);

  const filtered = searchTerm
    ? findings.filter(
        (f) =>
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : findings;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-emerald-400" />
          Cross-Repository Findings Explorer
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Query, filter, and inspect security vulnerabilities, logic defects, and duplicate clusters across the codebase.
        </p>
      </div>

      {/* Filter controls */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, file, evidence..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="SECURITY">Security</option>
            <option value="BUG">Bug</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="QUALITY">Quality</option>
            <option value="STYLE">Style</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open (Active)</option>
            <option value="SUPPRESSED">Suppressed (Duplicates)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} finding{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Findings Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Filtering findings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-[#111827] border border-slate-800 rounded-2xl">
          <h4 className="text-sm font-semibold text-white">No findings matched your filter</h4>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or changing your search terms.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((f) => (
            <FindingCard key={f.id} finding={f} isSuppressed={f.status === 'SUPPRESSED'} />
          ))}
        </div>
      )}
    </div>
  );
}
