from datetime import datetime
from sqlalchemy import Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

ESTADOS_PROSPECCAO = [
    "Nova",
    "Cotação Enviada",
    "Aguarda Seguradora",
    "Aguarda Cliente",
    "Aguarda Pagamento",
    "Convertida",
    "Perdida",
    "Cancelada",
]


class Prospeccao(Base):
    __tablename__ = "prospeccoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    seguradora_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("seguradoras.id"), nullable=True)
    ramo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ramos.id"), nullable=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="Nova")
    premio_estimado: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentagem_comissao: Mapped[float | None] = mapped_column(Float, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_seguimento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    apolice_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", lazy="selectin")
    seguradora: Mapped["Seguradora | None"] = relationship("Seguradora", lazy="selectin")
    ramo: Mapped["Ramo | None"] = relationship("Ramo", lazy="selectin")
