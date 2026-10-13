import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { fetchBenchmarkResults } from '../services/api';

export default function BenchmarkView() {
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBenchmark() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchBenchmarkResults();

        if (data.status === 'unavailable' || data.status === 'error') {
          throw new Error(data.message || 'Benchmark results unavailable');
        }

        setBenchmark(data);
      } catch (err) {
        console.error('Failed to load benchmark:', err);
        setError(err.message || 'Failed to load benchmark results');
      } finally {
        setLoading(false);
      }
    }

    loadBenchmark();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-400">
          Loading benchmark results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle size={20} />
            <span className="font-medium">
              Failed to load benchmark results
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="p-6">
        <div className="text-gray-400">
          No benchmark data available.
        </div>
      </div>
    );
  }

  const metrics = benchmark.metrics || {};
  const benchmarkCases = benchmark.cases || [];

  const formatPercent = (value) => {
    if (value === undefined || value === null) {
      return '—';
    }

    return `${(value * 100).toFixed(1)}%`;
  };

  const formatLatency = (value) => {
    if (value === undefined || value === null) {
      return '—';
    }

    return `${Number(value).toFixed(1)} ms`;
  };

  const getVerdictStyle = (verdict = '') => {
    const normalized = verdict.toUpperCase();

    if (normalized.startsWith('TRUE')) {
      return {
        className:
          'bg-green-500/10 text-green-400 border-green-500/20',
        icon: <CheckCircle2 size={16} />,
      };
    }

    if (normalized.startsWith('FALSE POSITIVE')) {
      return {
        className:
          'bg-red-500/10 text-red-400 border-red-500/20',
        icon: <XCircle size={16} />,
      };
    }

    if (normalized.startsWith('FALSE NEGATIVE')) {
      return {
        className:
          'bg-orange-500/10 text-orange-400 border-orange-500/20',
        icon: <AlertTriangle size={16} />,
      };
    }

    return {
      className:
        'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: <AlertTriangle size={16} />,
    };
  };

  const metricCards = [
    {
      title: 'Precision',
      value: formatPercent(metrics.precision),
      icon: <Award size={20} />,
    },
    {
      title: 'Recall',
      value: formatPercent(metrics.recall),
      icon: <CheckCircle2 size={20} />,
    },
    {
      title: 'F1 Score',
      value: formatPercent(metrics.f1_score),
      icon: <ShieldCheck size={20} />,
    },
    {
      title: 'False Positive Rate',
      value: formatPercent(metrics.false_positive_rate),
      icon: <XCircle size={20} />,
    },
    {
      title: 'Severity Agreement',
      value: formatPercent(metrics.severity_agreement_rate),
      icon: <ShieldCheck size={20} />,
    },
    {
      title: 'Avg Latency',
      value: formatLatency(metrics.avg_latency_ms),
      icon: <Clock size={20} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Benchmark
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Latest recorded evaluation of the ReviewGuard AI review engine.
        </p>
      </div>

      {/* Benchmark metadata */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">
              Provider
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {benchmark.provider || 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">
              Total benchmark cases
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {benchmark.total_benchmarks ?? benchmarkCases.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">
              Recorded at
            </p>

            <p className="mt-1 text-sm text-white">
              {benchmark.timestamp
                ? new Date(benchmark.timestamp).toLocaleString()
                : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric) => (
          <div
            key={metric.title}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {metric.title}
              </span>

              <span className="text-gray-400">
                {metric.icon}
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Finding / deduplication statistics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Finding Statistics
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">
              Raw Findings
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.raw_findings ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">
              Active Findings
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.active_findings ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">
              Suppressed Duplicates
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.suppressed_duplicates ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">
              Duplicate Suppression
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {formatPercent(metrics.duplicate_suppression_rate_pct / 100)}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed benchmark cases */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Benchmark Cases
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Results shown directly from the latest benchmark run.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Case
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Type
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Verdict
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Latency
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {benchmarkCases.map((testCase) => {
                const verdictStyle = getVerdictStyle(
                  testCase.verdict
                );

                return (
                  <tr
                    key={testCase.id}
                    className="hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">
                        {testCase.name}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {testCase.id}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-400">
                      {testCase.is_clean ? 'Clean' : 'Issue expected'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${verdictStyle.className}`}
                      >
                        {verdictStyle.icon}
                        {testCase.verdict}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-400">
                      {testCase.latency_ms != null
                        ? `${testCase.latency_ms} ms`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation note */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={20}
            className="mt-0.5 text-blue-400"
          />

          <div>
            <h3 className="font-medium text-white">
              Evaluation Note
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              These metrics are read directly from the latest
              recorded benchmark run. False positives and false
              negatives are displayed as observed rather than being
              hidden or replaced with idealized values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}