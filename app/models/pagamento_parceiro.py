"""Modelo de Pagamentos a Parceiros — registo manual de pagamentos efectuados."""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PagamentoParceiro(Base):
    __tablename__ = "pagamentos_parceiros"

    id:                   Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    data:                 Mapped[str]          = mapped_column(String(10), nullable=False)   # data do pagamento (YYYY-MM-DD)
    recebedor:            Mapped[str]          = mapped_column(String(200), nullable=False)   # nome de quem recebeu
    iban:                 Mapped[str | None]   = mapped_column(String(40), nullable=True)
    forma_pagamento:      Mapped[str]          = mapped_column(String(20), nullable=False)    # Transferência | Multicaixa | TPA
    cliente_referencia:   Mapped[str | None]   = mapped_column(String(200), nullable=True)    # cliente / referência
    tipo_servico:         Mapped[str | None]   = mapped_column(String(50), nullable=True)     # MO | Seguro | ...
    numero_transferencia: Mapped[str | None]   = mapped_column(String(60), nullable=True)
    banco:                Mapped[str | None]   = mapped_column(String(100), nullable=True)
    valor:                Mapped[float | None] = mapped_column(Float, nullable=True)
    estado:               Mapped[str]          = mapped_column(String(20), nullable=False, default="Pago")  # Pago | Pendente
    notas:                Mapped[str | None]   = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True),
                                        default=lambda: datetime.now(timezone.utc))
