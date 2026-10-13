import React from 'react';
import { BarChart3, TrendingUp, Layers, Clock, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '@/services/api';
import StatCard from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsView() {
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 bg-[#111827] border-slate-800 space-y-3">
              <Skeleton className="h-4 w-28 bg-slate-800" />
              <Skeleton className="h-8 w-20 bg-slate-800" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-[#111827] border-slate-800 h-80">
            <Skeleton className="h-full w-full bg-slate-800" />
          </Card>
          <Card className="p-6 bg-[#111827] border-slate-800 h-80">
            <Skeleton className="h-full w-full bg-slate-800" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-6 bg-[#111827] border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Failed to load analytics data.</span>
        </Card>
      </div>
    );
  }

  const severityData = [
    { name: 'Critical', count: analytics?.severity_distribution?.CRITICAL || 0, color: '#f43f5e' },
    { name: 'High', count: analytics?.severity_distribution?.HIGH || 0, color: '#fb923c' },
    { name: 'Medium', count: analytics?.severity_distribution?.MEDIUM || 0, color: '#fbbf24' },
    { name: 'Low', count: analytics?.severity_distribution?.LOW || 0, color: '#60a5fa' },
  ];

  const categoryData = Object.entries(analytics?.category_distribution || {}).map(([cat, count]) => ({
    name: cat,
    value: count,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          Review Productivity &amp; Security Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Quantitative telemetry on review turnaround, duplicate suppression, and code defect distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Senior Eng Hours Saved"
          value={`~${analytics?.estimated_hours_saved || 0} hrs`}
          subtitle="Estimated bottleneck alleviation"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Noise Reduction Rate"
          value={`${analytics?.suppression_rate_pct || 0}%`}
          subtitle={`${analytics?.duplicates_suppressed || 0} redundant nitpicks suppressed`}
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Average Review Turnaround"
          value={`${analytics?.avg_latency_ms || 2100} ms`}
          subtitle="Diff-aware automated pipeline"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        <Card className="bg-[#111827] border-slate-800 p-6">
          <h3 className="text-base font-semibold text-white mb-1">Findings by Severity Level</h3>
          <p className="text-xs text-slate-400 mb-6">Objective severity calibration distribution</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Categories Chart */}
        <Card className="bg-[#111827] border-slate-800 p-6">
          <h3 className="text-base font-semibold text-white mb-1">Defects by Category</h3>
          <p className="text-xs text-slate-400 mb-6">Security vulnerabilities vs logical bugs vs quality</p>
          <div className="h-64 w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-xs text-slate-400">No category data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
