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


class CotacaoComparacao(Base):
    """Agrupa múltiplas prospeccoes (até 4) para comparação de planos"""
    __tablename__ = "cotacao_comparacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    data_seguimento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", lazy="selectin")
    prospeccoes: Mapped[list["Prospeccao"]] = relationship("Prospeccao", back_populates="comparacao", lazy="selectin")


class Prospeccao(Base):
    __tablename__ = "prospeccoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    seguradora_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("seguradoras.id"), nullable=True)
    ramo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ramos.id"), nullable=True)
    comparacao_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cotacao_comparacoes.id"), nullable=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="Nova")
    premio_estimado: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentagem_comissao: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Novos campos de cobertura
    proteses_ortoses: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "Incluída", "Excluída", ou descrição
    copagamento_fora_rede: Mapped[float | None] = mapped_column(Float, nullable=True)  # Percentagem (%)
    periodo_carencia: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Dias
    plano_numero: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-4 para identificar qual plano
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_seguimento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    apolice_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", lazy="selectin")
    seguradora: Mapped["Seguradora | None"] = relationship("Seguradora", lazy="selectin")
    ramo: Mapped["Ramo | None"] = relationship("Ramo", lazy="selectin")
    comparacao: Mapped["CotacaoComparacao | None"] = relationship("CotacaoComparacao", back_populates="prospeccoes")
