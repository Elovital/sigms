"""Modelo de Cotações Enviadas — registo e acompanhamento."""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CotacaoEnviada(Base):
    __tablename__ = "cotacoes_enviadas"

    id:               Mapped[int]        = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero:           Mapped[str]        = mapped_column(String(20), unique=True, index=True)
    tipo:             Mapped[str]        = mapped_column(String(10))          # saude | auto
    cliente_nome:     Mapped[str | None] = mapped_column(String(200), nullable=True)
    email_destino:    Mapped[str]        = mapped_column(String(200))
    seguradoras:      Mapped[str | None] = mapped_column(Text, nullable=True) # JSON ["Seg1","Seg2","Seg3"]
    premios:          Mapped[str | None] = mapped_column(Text, nullable=True) # JSON [1000,2000,3000]
    veiculo_info:     Mapped[str | None] = mapped_column(String(300), nullable=True)  # ex: Toyota Hilux 2022
    # Estado do funil de vendas
    estado:           Mapped[str]        = mapped_column(String(30), default="Enviada")
    # Enviada | Visualizada | Interessado | Em Negociação | Convertido | Perdido
    notas:            Mapped[str | None] = mapped_column(Text, nullable=True)
    proximo_contacto: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True),
                                        default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True),
                                        default=lambda: datetime.now(timezone.utc),
                                        onupdate=lambda: datetime.now(timezone.utc))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[created_by])  # type: ignore
