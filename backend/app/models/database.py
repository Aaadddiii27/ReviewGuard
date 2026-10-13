import json
from datetime import datetime
from typing import Generator
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from app.core.config import settings

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBRepository(Base):
    __tablename__ = "repositories"

    id = Column(String(100), primary_key=True) # owner/repo
    workspace_id = Column(String(36), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    default_branch = Column(String(100), default="main")
    created_at = Column(DateTime, default=datetime.utcnow)


class DBPullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(String(150), primary_key=True) # owner/repo#pr_number
    workspace_id = Column(String(36), nullable=True, index=True)
    repository_name = Column(String(100), nullable=False, index=True)
    pr_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    author = Column(String(100), nullable=True)
    head_sha = Column(String(40), nullable=True)
    base_sha = Column(String(40), nullable=True)
    status = Column(String(50), default="OPEN") # OPEN, CLOSED, MERGED
    html_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DBReview(Base):
    __tablename__ = "reviews"

    id = Column(String(64), primary_key=True)
    workspace_id = Column(String(36), nullable=True, index=True)
    repository_name = Column(String(100), nullable=False, index=True)
    pr_number = Column(Integer, nullable=True, index=True)
    commit_sha = Column(String(40), nullable=True)
    pr_title = Column(String(500), nullable=True)
    status = Column(String(50), default="COMPLETED") # PENDING, COMPLETED, FAILED
    
    # Counts and distribution
    files_changed_count = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    raw_findings_count = Column(Integer, default=0)
    duplicates_suppressed = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)

    # Content
    summary_text = Column(Text, default="")
    key_concerns_json = Column(Text, default="[]")
    duration_ms = Column(Integer, default=0)
    engine_used = Column(String(100), default="qwen2.5-coder:1.5b")
    
    # GitHub commenting status
    github_commented = Column(Boolean, default=False)
    github_review_id = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    findings = relationship("DBFinding", back_populates="review", cascade="all, delete-orphan")

    @property
    def key_concerns(self):
        try:
            return json.loads(self.key_concerns_json or "[]")
        except Exception:
            return []

    @key_concerns.setter
    def key_concerns(self, val):
        self.key_concerns_json = json.dumps(val or [])


class DBFinding(Base):
    __tablename__ = "findings"

    id = Column(String(64), primary_key=True)
    review_id = Column(String(64), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True) # SECURITY, BUG, etc.
    severity = Column(String(50), nullable=False, index=True) # CRITICAL, HIGH, etc.
    confidence = Column(Float, default=0.85)
    file = Column(String(500), nullable=False, index=True)
    line = Column(Integer, nullable=True)
    start_line = Column(Integer, nullable=True)
    end_line = Column(Integer, nullable=True)
    side = Column(String(10), default="RIGHT")
    
    description = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)
    
    fingerprint = Column(String(64), nullable=True, index=True)
    source = Column(String(50), default="AI") # AI, STATIC_BANDIT, etc.
    status = Column(String(50), default="OPEN") # OPEN, SUPPRESSED, RESOLVED
    suppressed_by = Column(String(64), nullable=True)
    similarity_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    review = relationship("DBReview", back_populates="findings")


class DBUser(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspaces = relationship("DBWorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class DBWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("DBWorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    settings = relationship("DBSettings", back_populates="workspace", uselist=False, cascade="all, delete-orphan")


class DBWorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(String(36), primary_key=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="MEMBER")  # OWNER, ADMIN, MEMBER, VIEWER
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("DBWorkspace", back_populates="members")
    user = relationship("DBUser", back_populates="workspaces")


class DBSettings(Base):
    __tablename__ = "workspace_settings"

    id = Column(String(36), primary_key=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    ai_provider = Column(String(50), default="ollama")
    auto_review_enabled = Column(Boolean, default=True)
    post_comments_to_github = Column(Boolean, default=False)
    severity_threshold = Column(String(50), default="LOW")
    deduplication_threshold = Column(Float, default=0.78)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("DBWorkspace", back_populates="settings")


class DBReviewJob(Base):
    __tablename__ = "review_jobs"

    id = Column(String(36), primary_key=True)
    workspace_id = Column(String(36), nullable=True, index=True)
    repository_name = Column(String(100), nullable=False, index=True)
    pr_number = Column(Integer, nullable=True)
    commit_sha = Column(String(40), nullable=True)
    status = Column(String(50), default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED
    review_id = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Safe auto-migration for newly added columns without dropping existing user/benchmark data
    with engine.connect() as conn:
        for table, col in [("repositories", "workspace_id"), ("pull_requests", "workspace_id"), ("reviews", "workspace_id")]:
            try:
                from sqlalchemy import text
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} VARCHAR(36)"))
                conn.commit()
            except Exception:
                # Column already exists or table was just created by create_all
                pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
