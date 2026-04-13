from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Interacao(Base):
    __tablename__ = "interacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    # Chamada / Email / WhatsApp / Visita / Reunião / SMS / Outro
    data_interacao: Mapped[str] = mapped_column(String(10), nullable=False)
    hora: Mapped[str | None] = mapped_column(String(5), nullable=True)
    assunto: Mapped[str] = mapped_column(String(200), nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    resultado: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Interessado / Não Interessado / Aguardar / Proposta Enviada / Convertido
    proximo_contacto: Mapped[str | None] = mapped_column(String(10), nullable=True)
    lembrete_ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client")
