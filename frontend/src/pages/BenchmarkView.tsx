import React from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBenchmarkResults } from '@/services/api';
import { Card } from '@/components/ui/card';
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
import type { BenchmarkCase } from '@/types';

export default function BenchmarkView() {
  const {
    data: benchmark,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['benchmark'],
    queryFn: async () => {
      const data = await fetchBenchmarkResults();
      if (data.status === 'unavailable' || data.status === 'error') {
        throw new Error(data.message || 'Benchmark results unavailable');
      }
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Card className="p-5 bg-white/[0.03] border-white/10">
          <Skeleton className="h-12 w-full bg-slate-800" />
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 bg-white/[0.03] border-white/10 space-y-3">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-8 w-16 bg-slate-800" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to load benchmark results';
    return (
      <div className="p-6">
        <Card className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Failed to load benchmark results</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">{errorMsg}</p>
        </Card>
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-gray-400 bg-white/[0.03] border-white/10">
          No benchmark data available.
        </Card>
      </div>
    );
  }

  const metrics = benchmark.metrics || {};
  const benchmarkCases: BenchmarkCase[] = benchmark.cases || [];

  const formatPercent = (value?: number | null) => {
    if (value === undefined || value === null) {
      return '—';
    }
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatLatency = (value?: number | null) => {
    if (value === undefined || value === null) {
      return '—';
    }
    return `${Number(value).toFixed(1)} ms`;
  };

  const getVerdictStyle = (verdict = '') => {
    const normalized = verdict.toUpperCase();

    if (normalized.startsWith('TRUE')) {
      return {
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    }

    if (normalized.startsWith('FALSE POSITIVE')) {
      return {
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: <XCircle className="w-4 h-4" />,
      };
    }

    if (normalized.startsWith('FALSE NEGATIVE')) {
      return {
        className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }

    return {
      className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  };

  const metricCards = [
    {
      title: 'Precision',
      value: formatPercent(metrics.precision),
      icon: <Award className="w-5 h-5 text-gray-400" />,
    },
    {
      title: 'Recall',
      value: formatPercent(metrics.recall),
      icon: <CheckCircle2 className="w-5 h-5 text-gray-400" />,
    },
    {
      title: 'F1 Score',
      value: formatPercent(metrics.f1_score),
      icon: <ShieldCheck className="w-5 h-5 text-gray-400" />,
    },
    {
      title: 'False Positive Rate',
      value: formatPercent(metrics.false_positive_rate),
      icon: <XCircle className="w-5 h-5 text-gray-400" />,
    },
    {
      title: 'Severity Agreement',
      value: formatPercent(metrics.severity_agreement_rate),
      icon: <ShieldCheck className="w-5 h-5 text-gray-400" />,
    },
    {
      title: 'Avg Latency',
      value: formatLatency(metrics.avg_latency_ms),
      icon: <Clock className="w-5 h-5 text-gray-400" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Benchmark</h1>
        <p className="mt-1 text-sm text-gray-400">
          Latest recorded evaluation of the ReviewGuard AI review engine.
        </p>
      </div>

      {/* Benchmark metadata */}
      <Card className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">Provider</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {benchmark.provider || 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Total benchmark cases</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {benchmark.total_benchmarks ?? benchmarkCases.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Recorded at</p>
            <p className="mt-1 text-sm text-white">
              {benchmark.timestamp
                ? new Date(benchmark.timestamp).toLocaleString()
                : 'Unknown'}
            </p>
          </div>
        </div>
      </Card>

      {/* Main metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric) => (
          <Card
            key={metric.title}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{metric.title}</span>
              {metric.icon}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{metric.value}</p>
          </Card>
        ))}
      </div>

      {/* Finding / deduplication statistics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Finding Statistics</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">Raw Findings</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.raw_findings ?? '—'}
            </p>
          </Card>

          <Card className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">Active Findings</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.active_findings ?? '—'}
            </p>
          </Card>

          <Card className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">Suppressed Duplicates</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {metrics.suppressed_duplicates ?? '—'}
            </p>
          </Card>

          <Card className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-400">Duplicate Suppression</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatPercent(
                metrics.duplicate_suppression_rate_pct != null
                  ? metrics.duplicate_suppression_rate_pct / 100
                  : null
              )}
            </p>
          </Card>
        </div>
      </div>

      {/* Detailed benchmark cases */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Benchmark Cases</h2>
          <p className="mt-1 text-sm text-gray-400">
            Results shown directly from the latest benchmark run.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <Table className="min-w-full">
            <TableHeader className="bg-white/[0.03] border-b border-white/10">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Case
                </TableHead>
                <TableHead className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Type
                </TableHead>
                <TableHead className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Verdict
                </TableHead>
                <TableHead className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Latency
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/10">
              {benchmarkCases.map((testCase) => {
                const verdictStyle = getVerdictStyle(testCase.verdict);

                return (
                  <TableRow key={testCase.id} className="border-white/10 hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4">
                      <div className="font-medium text-white">{testCase.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{testCase.id}</div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-400">
                      {testCase.is_clean ? 'Clean' : 'Issue expected'}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${verdictStyle.className}`}
                      >
                        {verdictStyle.icon}
                        {testCase.verdict}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-400">
                      {testCase.latency_ms != null ? `${testCase.latency_ms} ms` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Evaluation note */}
      <Card className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 mt-0.5 text-blue-400 shrink-0" />
          <div>
            <h3 className="font-medium text-white">Evaluation Note</h3>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              These metrics are read directly from the latest recorded benchmark run. False positives and
              false negatives are displayed as observed rather than being hidden or replaced with idealized values.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
