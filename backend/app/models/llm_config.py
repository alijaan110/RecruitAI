from sqlalchemy import String, Boolean, Float, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDMixin, TimestampMixin


class LLMConfig(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "llm_configs"

    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), server_default="mock", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), server_default="mock-model", nullable=False)
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    temperature: Mapped[float] = mapped_column(Float, server_default="0.7", nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, server_default="1000", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="1", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_llm_config_tenant"),
    )
