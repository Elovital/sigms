from datetime import datetime
from sqlalchemy import Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Premio(Base):
    __tablename__ = "premios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=False)
    fracionamento: Mapped[str] = mapped_column(String(20), nullable=False, default="Anual")
    premio_base: Mapped[float] = mapped_column(Float, nullable=False)
    encargos: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    imposto_selo: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    premio_total: Mapped[float] = mapped_column(Float, nullable=False)
    moeda: Mapped[str] = mapped_column(String(3), nullable=False, default="AKZ")
    periodo_inicio: Mapped[str] = mapped_column(String(10), nullable=False)
    periodo_fim: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="premios")
    pagamentos: Mapped[list["Pagamento"]] = relationship("Pagamento", back_populates="premio")


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    premio_id: Mapped[int] = mapped_column(Integer, ForeignKey("premios.id"), nullable=False)
    data_vencimento: Mapped[str] = mapped_column(String(10), nullable=False)
    data_pagamento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Pendente")
    metodo: Mapped[str | None] = mapped_column(String(30), nullable=True)
    referencia: Mapped[str | None] = mapped_column(String(100), nullable=True)
    alerta_d1_enviado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    premio: Mapped["Premio"] = relationship("Premio", back_populates="pagamentos")
    comissoes: Mapped[list["Comissao"]] = relationship("Comissao", back_populates="pagamento")


class Comissao(Base):
    __tablename__ = "comissoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=False)
    pagamento_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("pagamentos.id"), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="angariacao")
    percentagem: Mapped[float] = mapped_column(Float, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    data_referencia: Mapped[str] = mapped_column(String(10), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Prevista")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="comissoes")
    pagamento: Mapped["Pagamento | None"] = relationship("Pagamento", back_populates="comissoes")
