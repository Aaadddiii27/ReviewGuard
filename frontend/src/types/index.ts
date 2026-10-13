export type FindingCategory = 'SECURITY' | 'BUG' | 'PERFORMANCE' | 'QUALITY' | 'STYLE';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'OPEN' | 'SUPPRESSED' | 'RESOLVED';
export type FindingSource = 'AI' | 'STATIC_BANDIT' | 'STATIC_AST' | 'HYBRID' | string;

export interface Finding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence?: number;
  file: string;
  line?: number | null;
  description: string;
  why_it_matters: string;
  recommendation: string;
  evidence?: string | null;
  fingerprint?: string;
  source?: FindingSource;
  status: FindingStatus;
  suppressed_by?: string | null;
  similarity_score?: number | null;
}

export interface ReviewSummary {
  files_changed_count: number;
  findings_count: number;
  raw_findings_count?: number;
  duplicates_suppressed: number;
  severity_distribution: Record<FindingSeverity, number>;
  summary_text: string;
  key_concerns: string[];
  human_approval_reminder?: string;
  review_duration_ms: number;
  engine_used: string;
  created_at?: string;
}

export interface Review {
  id: string;
  repository: string;
  pr_number?: number | null;
  pr_title?: string;
  commit_sha?: string;
  status?: string;
  summary: ReviewSummary;
  findings: Finding[];
  suppressed_findings: Finding[];
  files_reviewed?: string[];
  created_at?: string;
  // List-item specific aggregated fields returned by API
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  duplicates_suppressed?: number;
  duration_ms?: number;
  engine_used?: string;
}

export interface Repository {
  id: string;
  name: string;
  default_branch: string;
  created_at?: string;
}

export interface AnalyticsOverview {
  total_reviews: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  duplicates_suppressed: number;
  suppression_rate_pct?: number;
  avg_latency_ms: number;
  estimated_hours_saved?: number;
  severity_distribution?: Record<FindingSeverity, number>;
  category_distribution?: Record<string, number>;
}

export interface BenchmarkCase {
  id: string;
  name: string;
  is_clean: boolean;
  verdict: string;
  latency_ms?: number | null;
}

export interface BenchmarkMetrics {
  precision?: number;
  recall?: number;
  f1_score?: number;
  false_positive_rate?: number;
  severity_agreement_rate?: number;
  avg_latency_ms?: number;
  raw_findings?: number;
  active_findings?: number;
  suppressed_duplicates?: number;
  duplicate_suppression_rate_pct?: number;
}

export interface BenchmarkResult {
  status?: string;
  message?: string;
  provider?: string;
  total_benchmarks?: number;
  timestamp?: string;
  metrics?: BenchmarkMetrics;
  cases?: BenchmarkCase[];
}

export interface TriggerReviewPayload {
  repository: string;
  pr_number?: number | null;
  pr_title?: string;
  diff_text: string;
  post_comments_to_github?: boolean;
  github_token?: string;
}
