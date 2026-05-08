from datetime import datetime
from typing import List
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base, UUIDMixin, TimestampMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    plan: Mapped[str] = mapped_column(String, server_default="free", nullable=False)
    cv_uploads_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    cv_uploads_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    stripe_sub_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="1", nullable=False)

    users: Mapped[List["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    jobs: Mapped[List["Job"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
