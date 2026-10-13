import type {
  AnalyticsOverview,
  Review,
  Finding,
  Repository,
  TriggerReviewPayload,
  BenchmarkResult,
} from '@/types';

const API_BASE = '/api/v1';

export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchReviews(params: Record<string, string | number> = {}): Promise<Review[]> {
  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {})
  ).toString();
  const res = await fetch(`${API_BASE}/reviews${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReviewDetail(reviewId: string): Promise<Review> {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`);
  if (!res.ok) throw new Error(`Failed to fetch review ${reviewId}`);
  return res.json();
}

export async function fetchFindings(params: Record<string, string | number> = {}): Promise<Finding[]> {
  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {})
  ).toString();
  const res = await fetch(`${API_BASE}/findings${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API_BASE}/repositories`);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function triggerReview(payload: TriggerReviewPayload): Promise<Review> {
  const res = await fetch(`${API_BASE}/reviews/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Review execution failed' }));
    throw new Error(err.detail || 'Review execution failed');
  }
  return res.json();
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch('/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchBenchmarkResults(): Promise<BenchmarkResult> {
  const res = await fetch(`${API_BASE}/analytics/benchmark`);
  if (!res.ok) {
    throw new Error('Failed to fetch benchmark results');
  }
  return res.json();
}
