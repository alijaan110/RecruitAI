from datetime import datetime
from typing import List
from sqlalchemy import String, ForeignKey, JSON, Text, Numeric, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base, UUIDMixin, TimestampMixin


class Application(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "applications"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String, server_default="received", nullable=False)
    keyword_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_breakdown: Mapped[dict] = mapped_column(JSON, server_default='{}')
    is_starred: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    is_disqualified: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    disqualify_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_stage_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job: Mapped["Job"] = relationship(back_populates="applications")
    candidate: Mapped["Candidate"] = relationship(back_populates="applications")
    stage_history: Mapped[List["StageHistory"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    notes: Mapped[List["CandidateNote"]] = relationship(back_populates="application", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate"),
    )
