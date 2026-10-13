const API_BASE = '/api/v1';

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchReviews(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/reviews${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReviewDetail(reviewId) {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`);
  if (!res.ok) throw new Error(`Failed to fetch review ${reviewId}`);
  return res.json();
}

export async function fetchFindings(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/findings${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function fetchRepositories() {
  const res = await fetch(`${API_BASE}/repositories`);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function triggerReview(payload) {
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

export async function fetchHealth() {
  const res = await fetch('/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
export async function fetchBenchmarkResults() {
  const res = await fetch(`${API_BASE}/analytics/benchmark`);

  if (!res.ok) {
    throw new Error('Failed to fetch benchmark results');
  }

  return res.json();
}