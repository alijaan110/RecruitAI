from datetime import datetime
from typing import List
from sqlalchemy import String, ForeignKey, Integer, JSON, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class Job(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "jobs"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str] = mapped_column(String, server_default="full_time", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[list] = mapped_column(JSON, server_default='[]', nullable=False)
    nice_to_have: Mapped[list] = mapped_column(JSON, server_default='[]', nullable=False)
    keywords: Mapped[list] = mapped_column(JSON, server_default='[]', nullable=False)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), server_default="USD")
    status: Mapped[str] = mapped_column(String, server_default="draft", nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="jobs")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    applications: Mapped[List["Application"]] = relationship(back_populates="job", cascade="all, delete-orphan")
