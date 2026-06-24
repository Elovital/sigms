from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RiscoAuto(Base):
    __tablename__ = "riscos_auto"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), unique=True, nullable=False)
    matricula: Mapped[str] = mapped_column(String(20), nullable=False)
    chassis: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marca: Mapped[str | None] = mapped_column(String(50), nullable=True)
    modelo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ano: Mapped[int | None] = mapped_column(Integer, nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(30), nullable=True)
    uso: Mapped[str | None] = mapped_column(String(20), nullable=True)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="risco_auto")


class RiscoSaudeVida(Base):
    __tablename__ = "riscos_saude_vida"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # Saude / Vida
    capital_seguro: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_inicio_cobertura: Mapped[str | None] = mapped_column(String(10), nullable=True)
    questionario_clinico_enc: Mapped[str | None] = mapped_column(Text, nullable=True)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="risco_saude_vida")
    # lazy="selectin": carregar beneficiários de forma eager — em async, o acesso
    # lazy implícito a esta relação rebenta com MissingGreenlet (Erro 500).
    beneficiarios: Mapped[list["Beneficiario"]] = relationship("Beneficiario", back_populates="risco", cascade="all, delete-orphan", lazy="selectin")


class Beneficiario(Base):
    __tablename__ = "beneficiarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    risco_saude_vida_id: Mapped[int] = mapped_column(Integer, ForeignKey("riscos_saude_vida.id", ondelete="CASCADE"), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    nif: Mapped[str | None] = mapped_column(String(20), nullable=True)
    data_nascimento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    parentesco: Mapped[str | None] = mapped_column(String(50), nullable=True)
    percentagem: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)

    risco: Mapped["RiscoSaudeVida"] = relationship("RiscoSaudeVida", back_populates="beneficiarios")


class RiscoEmpresa(Base):
    __tablename__ = "riscos_empresa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # Frota / AT / Multirriscos
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    num_veiculos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_trabalhadores: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capital_edificio: Mapped[float | None] = mapped_column(Float, nullable=True)
    capital_conteudo: Mapped[float | None] = mapped_column(Float, nullable=True)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="risco_empresa")
