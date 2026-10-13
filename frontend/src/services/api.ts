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

// Auth token storage
export function getAuthToken(): string | null {
  return localStorage.getItem('reviewguard_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('reviewguard_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('reviewguard_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginUser(email: string, password: string): Promise<import('@/types').AuthState> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Authentication failed');
  }
  const data = await res.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function registerUser(payload: { email: string; password: string; full_name?: string; workspace_name?: string }): Promise<import('@/types').AuthState> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  const data = await res.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function fetchUserProfile(): Promise<import('@/types').AuthState> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Session expired or unauthorized');
  return res.json();
}

export async function fetchSettings(workspaceId?: string): Promise<import('@/types').WorkspaceSettings> {
  const url = workspaceId ? `${API_BASE}/settings?workspace_id=${workspaceId}` : `${API_BASE}/settings`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(payload: Partial<import('@/types').WorkspaceSettings>): Promise<import('@/types').WorkspaceSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchJobs(limit: number = 30): Promise<import('@/types').ReviewJob[]> {
  const res = await fetch(`${API_BASE}/jobs?limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export async function reviewManualSnippet(payload: import('@/types').ManualSnippetPayload): Promise<Review> {
  const res = await fetch(`${API_BASE}/manual/snippet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Manual review failed' }));
    throw new Error(err.detail || 'Manual review failed');
  }
  return res.json();
}

export async function reviewUploadedFile(formData: FormData): Promise<Review> {
  const res = await fetch(`${API_BASE}/manual/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'File review failed' }));
    throw new Error(err.detail || 'File review failed');
  }
  return res.json();
}
