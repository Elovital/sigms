from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # Singular / Coletiva
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    nif: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    data_nascimento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    data_constituicao: Mapped[str | None] = mapped_column(String(10), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    morada_linha1: Mapped[str | None] = mapped_column(String(200), nullable=True)
    morada_linha2: Mapped[str | None] = mapped_column(String(200), nullable=True)
    provincia: Mapped[str | None] = mapped_column(String(50), nullable=True)
    municipio: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rgpd_aceite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    anonymized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts: Mapped[list["Contact"]] = relationship("Contact", back_populates="client", cascade="all, delete-orphan", lazy="selectin")
    rgpd_logs: Mapped[list["RgpdConsentLog"]] = relationship("RgpdConsentLog", back_populates="client")
    apolices: Mapped[list["Apolice"]] = relationship("Apolice", back_populates="client")
    sinistros: Mapped[list["Sinistro"]] = relationship("Sinistro", back_populates="client")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # telefone/telemovel/email/fax
    valor: Mapped[str] = mapped_column(String(100), nullable=False)
    principal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", back_populates="contacts")


class RgpdConsentLog(Base):
    __tablename__ = "rgpd_consent_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    channel: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    client: Mapped["Client"] = relationship("Client", back_populates="rgpd_logs")
