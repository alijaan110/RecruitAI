from typing import List
from sqlalchemy import String, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class Candidate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "candidates"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), server_default="direct")
    cv_file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    cv_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_cv_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_data: Mapped[dict] = mapped_column(JSON, server_default='{}', nullable=False)

    applications: Mapped[List["Application"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),
    )
