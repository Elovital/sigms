from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Seguradora(Base):
    __tablename__ = "seguradoras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    nif: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    apolices: Mapped[list["Apolice"]] = relationship("Apolice", back_populates="seguradora")


class Ramo(Base):
    __tablename__ = "ramos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)

    apolices: Mapped[list["Apolice"]] = relationship("Apolice", back_populates="ramo")


class Apolice(Base):
    __tablename__ = "apolices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    seguradora_id: Mapped[int] = mapped_column(Integer, ForeignKey("seguradoras.id"), nullable=False)
    ramo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ramos.id"), nullable=False)
    data_inicio: Mapped[str] = mapped_column(String(10), nullable=False)
    data_fim: Mapped[str] = mapped_column(String(10), nullable=False)
    data_renovacao: Mapped[str | None] = mapped_column(String(10), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Ativa")
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    alerta_renovacao_enviado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    vendedor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", back_populates="apolices", lazy="selectin")
    vendedor: Mapped["User | None"] = relationship("User", foreign_keys="[Apolice.vendedor_id]", lazy="selectin")
    seguradora: Mapped["Seguradora"] = relationship("Seguradora", back_populates="apolices", lazy="selectin")
    ramo: Mapped["Ramo"] = relationship("Ramo", back_populates="apolices", lazy="selectin")
    premios: Mapped[list["Premio"]] = relationship("Premio", back_populates="apolice", lazy="selectin")
    comissoes: Mapped[list["Comissao"]] = relationship("Comissao", back_populates="apolice", lazy="selectin")
    sinistros: Mapped[list["Sinistro"]] = relationship("Sinistro", back_populates="apolice")
    risco_auto: Mapped["RiscoAuto | None"] = relationship("RiscoAuto", back_populates="apolice", uselist=False, lazy="selectin")
    risco_saude_vida: Mapped["RiscoSaudeVida | None"] = relationship("RiscoSaudeVida", back_populates="apolice", uselist=False, lazy="selectin")
    risco_empresa: Mapped["RiscoEmpresa | None"] = relationship("RiscoEmpresa", back_populates="apolice", uselist=False, lazy="selectin")
