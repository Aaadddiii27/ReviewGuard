import re
from typing import List, Tuple, Dict, Any, Optional
from pydantic import BaseModel
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.schemas.finding import Finding, FindingStatus, FindingSeverity
from app.core.config import settings
from app.core.logging import logger


class DeduplicationStats(BaseModel):
    raw_findings: int = 0
    active_findings: int = 0
    suppressed_findings: int = 0
    suppression_rate_pct: float = 0.0


SEVERITY_ORDER = {
    FindingSeverity.CRITICAL: 4,
    FindingSeverity.HIGH: 3,
    FindingSeverity.MEDIUM: 2,
    FindingSeverity.LOW: 1
}


class DeduplicationEngine:
    def __init__(self, threshold: float = 0.65):
        self.threshold = threshold

    def normalize_text(self, text: str) -> str:
        """Strips noise, punctuation, and code tokens for robust semantic text comparison."""
        if not text:
            return ""
        text = text.lower()
        # Normalize variables and quotes
        text = re.sub(r'[`\'"][a-zA-Z0-9_\-\.\/]+[`\'"]', ' var ', text)
        # Strip non-alphanumeric
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return re.sub(r'\s+', ' ', text).strip()

    def _calculate_jaccard(self, text1: str, text2: str) -> float:
        """Computes set-based token overlap (Jaccard similarity)."""
        w1 = set(text1.split())
        w2 = set(text2.split())
        if not w1 or not w2:
            return 0.0
        intersection = w1.intersection(w2)
        union = w1.union(w2)
        return len(intersection) / len(union)

    def deduplicate(self, findings: List[Finding]) -> Tuple[List[Finding], List[Finding], DeduplicationStats]:
        """Identifies duplicate/overlapping findings and suppresses redundancies."""
        if not findings or len(findings) <= 1:
            stats = DeduplicationStats(
                raw_findings=len(findings),
                active_findings=len(findings),
                suppressed_findings=0,
                suppression_rate_pct=0.0
            )
            return findings, [], stats

        norm_texts = [
            self.normalize_text(f"{f.title} {f.description} {f.why_it_matters}")
            for f in findings
        ]

        # Calculate TF-IDF matrix if multiple documents exist
        sim_matrix = np.eye(len(findings))
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
            tfidf = vectorizer.fit_transform(norm_texts)
            sim_matrix = cosine_similarity(tfidf, tfidf)
        except Exception as e:
            logger.debug(f"TF-IDF matrix generation skipped: {e}")

        suppressed_indices = set()
        suppression_map: Dict[int, Tuple[int, float]] = {}

        for i in range(len(findings)):
            if i in suppressed_indices:
                continue

            for j in range(i + 1, len(findings)):
                if j in suppressed_indices:
                    continue

                f1, f2 = findings[i], findings[j]
                t1, t2 = norm_texts[i], norm_texts[j]

                tfidf_sim = float(sim_matrix[i, j])
                jaccard_sim = self._calculate_jaccard(t1, t2)
                semantic_text_sim = max(tfidf_sim, jaccard_sim)

                same_file = (f1.file == f2.file)
                same_category = (f1.category == f2.category)
                
                line_proximity = False
                line_diff = 999
                if same_file and f1.line is not None and f2.line is not None:
                    line_diff = abs(f1.line - f2.line)
                    line_proximity = (line_diff <= 5)

                # Check shared key security concepts
                security_concepts = {"sql", "injection", "sqli", "eval", "exec", "rce", "password", "secret", "token", "xss", "overflow", "buffer"}
                words1 = set(t1.split())
                words2 = set(t2.split())
                shared_concepts = (words1 & words2) & security_concepts

                is_duplicate = False
                final_score = semantic_text_sim

                # Condition 1: High semantic similarity anywhere
                if semantic_text_sim >= self.threshold:
                    is_duplicate = True
                    final_score = semantic_text_sim

                # Condition 2: Same file + same category + line proximity + some shared context
                elif same_file and same_category and line_proximity and (semantic_text_sim >= 0.20 or bool(shared_concepts)):
                    is_duplicate = True
                    final_score = max(0.75, semantic_text_sim + 0.30)

                # Condition 3: Same file + same category + same line
                elif same_file and same_category and (f1.line == f2.line) and (f1.line is not None):
                    is_duplicate = True
                    final_score = 0.90

                if is_duplicate:
                    # Choose which finding is primary to keep:
                    # Prefer higher severity, higher confidence, AST over AI
                    rank1 = (SEVERITY_ORDER.get(f1.severity, 0), f1.confidence, 1 if f1.source != "AI" else 0)
                    rank2 = (SEVERITY_ORDER.get(f2.severity, 0), f2.confidence, 1 if f2.source != "AI" else 0)

                    if rank1 >= rank2:
                        suppressed_indices.add(j)
                        suppression_map[j] = (i, round(final_score, 3))
                    else:
                        suppressed_indices.add(i)
                        suppression_map[i] = (j, round(final_score, 3))
                        break

        active_findings: List[Finding] = []
        suppressed_findings: List[Finding] = []

        for idx, finding in enumerate(findings):
            if idx in suppressed_indices:
                parent_idx, score = suppression_map[idx]
                parent = findings[parent_idx]
                finding.status = FindingStatus.SUPPRESSED
                finding.suppressed_by = parent.id
                finding.similarity_score = score
                suppressed_findings.append(finding)
            else:
                finding.status = FindingStatus.OPEN
                active_findings.append(finding)

        raw_count = len(findings)
        active_count = len(active_findings)
        suppressed_count = len(suppressed_findings)
        suppression_rate = round((suppressed_count / raw_count * 100), 1) if raw_count > 0 else 0.0

        stats = DeduplicationStats(
            raw_findings=raw_count,
            active_findings=active_count,
            suppressed_findings=suppressed_count,
            suppression_rate_pct=suppression_rate
        )

        logger.info(
            f"Deduplication completed. Raw: {raw_count}, Active: {active_count}, "
            f"Suppressed: {suppressed_count} ({suppression_rate}%)"
        )

        return active_findings, suppressed_findings, stats
