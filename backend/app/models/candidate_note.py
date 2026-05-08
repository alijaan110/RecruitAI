from sqlalchemy import String, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class CandidateNote(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "candidate_notes"

    application_id: Mapped[str] = mapped_column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    note_type: Mapped[str] = mapped_column(String, server_default="general", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)

    application: Mapped["Application"] = relationship(back_populates="notes")
