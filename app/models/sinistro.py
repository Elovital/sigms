from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Sinistro(Base):
    __tablename__ = "sinistros"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_processo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    apolice_id: Mapped[int] = mapped_column(Integer, ForeignKey("apolices.id"), nullable=False)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    data_sinistro: Mapped[str] = mapped_column(String(10), nullable=False)
    data_participacao: Mapped[str | None] = mapped_column(String(10), nullable=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="Aberto")
    valor_estimado: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_pago: Mapped[float | None] = mapped_column(Float, nullable=True)
    perito: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apolice: Mapped["Apolice"] = relationship("Apolice", back_populates="sinistros")
    client: Mapped["Client"] = relationship("Client", back_populates="sinistros")
    docs: Mapped[list["SinistroDoc"]] = relationship("SinistroDoc", back_populates="sinistro", cascade="all, delete-orphan")


class SinistroDoc(Base):
    __tablename__ = "sinistro_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sinistro_id: Mapped[int] = mapped_column(Integer, ForeignKey("sinistros.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sinistro: Mapped["Sinistro"] = relationship("Sinistro", back_populates="docs")
