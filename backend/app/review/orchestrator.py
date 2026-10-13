import time
import uuid
from typing import Optional, List
from sqlalchemy.orm import Session

from app.schemas.review import ReviewRequest, ReviewResult, ReviewSummary
from app.schemas.finding import Finding, FindingStatus
from app.diff.parser import DiffParser, ParsedDiff
from app.analysis.static_analyzer import StaticAnalysisManager
from app.ai.engine import AIReviewEngine
from app.severity.engine import SeverityEngine
from app.deduplication.engine import DeduplicationEngine
from app.review.summary_builder import SummaryBuilder
from app.models.database import DBReview, DBFinding, DBPullRequest, DBRepository
from app.core.logging import logger
from app.core.config import settings


class ReviewOrchestrator:
    def __init__(self, ai_provider: Optional[str] = None):
        self.diff_parser = DiffParser()
        self.static_analyzer = StaticAnalysisManager()
        self.ai_engine = AIReviewEngine(provider_name=ai_provider)
        self.severity_engine = SeverityEngine()
        self.deduplication_engine = DeduplicationEngine()

    async def execute_review(
        self,
        request: ReviewRequest,
        db: Optional[Session] = None
    ) -> ReviewResult:
        start_time = time.time()
        review_id = str(uuid.uuid4())
        
        logger.info(f"Starting review {review_id} for repo={request.repository} PR={request.pr_number}")

        # 1. Parse unified diff
        diff_text = request.diff_text or ""
        parsed_diff: ParsedDiff = self.diff_parser.parse_patch(diff_text)
        
        raw_findings: List[Finding] = []
        ai_summaries: List[str] = []
        files_reviewed: List[str] = []

        # Lazily construct a GitHub client — only used when a token + commit SHA are available
        # so we can fetch complete file content for accurate AST analysis.
        github_client = None
        can_fetch_full_files = bool(
            request.repository and request.commit_sha and settings.GITHUB_TOKEN
        )
        if can_fetch_full_files:
            from app.github.client import GitHubClient
            github_client = GitHubClient()

        # 2. Iterate through changed files
        for changed_file in parsed_diff.files:
            file_path = changed_file.filename
            files_reviewed.append(file_path)
            modified_lines = parsed_diff.modified_lines_by_file.get(file_path, set())

            # --- Determine best code content for static analysis --------
            # Strategy (in priority order):
            #   1. Full file fetched from GitHub Contents API at HEAD commit
            #      → complete, syntactically valid → ideal for AST analysis.
            #   2. Sparse diff reconstruction (get_reconstructed_file_content)
            #      → incomplete, may have blank-line gaps → mark as partial.
            #   3. Raw patch text as last resort (even more incomplete).
            #
            # When a partial reconstruction is used we set
            # is_partial_reconstruction=True so the static analyser suppresses
            # SyntaxError findings that are artefacts of the reconstruction.
            # -----------------------------------------------------------------
            full_file_content: Optional[str] = None
            if github_client and request.repository and request.commit_sha:
                try:
                    full_file_content = await github_client.get_file_content(
                        repo=request.repository,
                        path=file_path,
                        ref=request.commit_sha,
                    )
                except Exception as e:
                    logger.debug(f"get_file_content failed for {file_path}: {e}")

            if full_file_content is not None:
                # Full file available → run analysis on real, complete source.
                code_content = full_file_content
                is_partial = False
                logger.debug(f"Using full GitHub file content for {file_path} ({len(code_content)} chars)")
            else:
                # Fall back to sparse reconstruction.
                reconstructed = parsed_diff.get_reconstructed_file_content(file_path)
                code_content = reconstructed or changed_file.patch or ""
                # Detect whether this is a sparse reconstruction so we can
                # suppress bogus SyntaxError findings.
                from app.diff.parser import ParsedDiff as _PD
                is_partial = bool(reconstructed) and _PD.is_likely_incomplete(reconstructed)
                if is_partial:
                    logger.debug(f"Sparse reconstruction detected for {file_path} — SyntaxError findings suppressed")

            # A. Static code analysis
            annotated_diff = parsed_diff.get_annotated_diff_code(file_path)
            static_findings = self.static_analyzer.analyze_file(
                file_path=file_path,
                code_content=code_content,
                modified_lines=modified_lines,
                is_partial_reconstruction=is_partial,
            )
            raw_findings.extend(static_findings)


            # B. AI Semantic Review (only if annotated diff contains code)
            if annotated_diff.strip():
                ai_summary, ai_findings = await self.ai_engine.review_file_diff(
                    file_path=file_path,
                    annotated_diff=annotated_diff,
                    pr_title=request.pr_title or "",
                    pr_description=request.pr_description or ""
                )
                if ai_summary:
                    ai_summaries.append(ai_summary)
                raw_findings.extend(ai_findings)

        # 3. Line validation and calibration
        # Ensure line numbers are actually in the PR diff whenever possible
        for finding in raw_findings:
            if finding.line:
                if not parsed_diff.is_line_in_diff(finding.file, finding.line):
                    closest_line = parsed_diff.get_closest_diff_line(finding.file, finding.line)
                    if closest_line:
                        finding.line = closest_line
                    # If still not in diff, leave line or clear it so it doesn't break GitHub PR comment
            
            # 4. Severity Calibration
            self.severity_engine.apply_to_finding(finding)

        # 5. Deduplication and Suppression
        active_findings, suppressed_findings, dedup_stats = self.deduplication_engine.deduplicate(raw_findings)

        duration_ms = int((time.time() - start_time) * 1000)

        # 6. Build PR-level Review Summary
        summary: ReviewSummary = SummaryBuilder.build(
            files_changed_count=len(parsed_diff.files),
            active_findings=active_findings,
            raw_findings_count=len(raw_findings),
            duplicates_suppressed=len(suppressed_findings),
            ai_summaries=ai_summaries,
            duration_ms=duration_ms,
            engine_used=self.ai_engine.provider_name
        )

        result = ReviewResult(
            id=review_id,
            repository=request.repository,
            pr_number=request.pr_number,
            commit_sha=request.commit_sha,
            pr_title=request.pr_title,
            status="COMPLETED",
            summary=summary,
            findings=active_findings,
            suppressed_findings=suppressed_findings,
            files_reviewed=files_reviewed
        )

        # 7. Persist to Database if session provided
        if db:
            try:
                self._persist_review(db, result)
            except Exception as e:
                logger.error(f"Failed to persist review {review_id} to database: {e}")
                db.rollback()

        return result

    def _persist_review(self, db: Session, result: ReviewResult) -> None:
        # Upsert repository
        repo = db.query(DBRepository).filter(DBRepository.id == result.repository).first()
        if not repo:
            repo = DBRepository(id=result.repository, name=result.repository)
            db.add(repo)

        # Upsert pull request if pr_number is present
        if result.pr_number:
            pr_id = f"{result.repository}#{result.pr_number}"
            pr = db.query(DBPullRequest).filter(DBPullRequest.id == pr_id).first()
            if not pr:
                pr = DBPullRequest(
                    id=pr_id,
                    repository_name=result.repository,
                    pr_number=result.pr_number,
                    title=result.pr_title or f"PR #{result.pr_number}",
                    head_sha=result.commit_sha
                )
                db.add(pr)

        # Insert DBReview
        db_review = DBReview(
            id=result.id,
            repository_name=result.repository,
            pr_number=result.pr_number,
            commit_sha=result.commit_sha,
            pr_title=result.pr_title,
            status=result.status,
            files_changed_count=result.summary.files_changed_count,
            findings_count=result.summary.findings_count,
            raw_findings_count=result.summary.raw_findings_count,
            duplicates_suppressed=result.summary.duplicates_suppressed,
            critical_count=result.summary.severity_distribution.CRITICAL,
            high_count=result.summary.severity_distribution.HIGH,
            medium_count=result.summary.severity_distribution.MEDIUM,
            low_count=result.summary.severity_distribution.LOW,
            summary_text=result.summary.summary_text,
            key_concerns_json="",
            duration_ms=result.summary.review_duration_ms,
            engine_used=result.summary.engine_used,
            github_commented=False
        )
        db_review.key_concerns = result.summary.key_concerns
        db.add(db_review)

        # Insert Active and Suppressed Findings
        all_findings = result.findings + result.suppressed_findings
        for f in all_findings:
            db_finding = DBFinding(
                id=f.id,
                review_id=result.id,
                title=f.title,
                category=f.category.value,
                severity=f.severity.value,
                confidence=f.confidence,
                file=f.file,
                line=f.line,
                start_line=f.start_line,
                end_line=f.end_line,
                side=f.side,
                description=f.description,
                why_it_matters=f.why_it_matters,
                recommendation=f.recommendation,
                evidence=f.evidence,
                fingerprint=f.fingerprint,
                source=f.source.value,
                status=f.status.value,
                suppressed_by=f.suppressed_by,
                similarity_score=f.similarity_score
            )
            db.add(db_finding)

        db.commit()
        logger.info(f"Successfully persisted review {result.id} to database.")
