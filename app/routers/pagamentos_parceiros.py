"""Pagamentos a Parceiros — registo manual de pagamentos efectuados e relatório."""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.pagamento_parceiro import PagamentoParceiro
from app.models.user import User

router = APIRouter(prefix="/pagamentos-parceiros", tags=["pagamentos-parceiros"])

FORMAS = {"Transferência", "Multicaixa", "TPA"}
ESTADOS = {"Pago", "Pendente"}


class PagamentoParceiroIn(BaseModel):
    data: str
    recebedor: str
    iban: Optional[str] = None
    forma_pagamento: str
    cliente_referencia: Optional[str] = None
    tipo_servico: Optional[str] = None
    numero_transferencia: Optional[str] = None
    banco: Optional[str] = None
    valor: Optional[float] = None
    estado: str = "Pago"
    notas: Optional[str] = None


def _dict(p: PagamentoParceiro) -> dict:
    return {
        "id": p.id, "data": p.data, "recebedor": p.recebedor, "iban": p.iban,
        "forma_pagamento": p.forma_pagamento, "cliente_referencia": p.cliente_referencia,
        "tipo_servico": p.tipo_servico, "numero_transferencia": p.numero_transferencia,
        "banco": p.banco, "valor": p.valor, "estado": p.estado, "notas": p.notas,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _validar(body: PagamentoParceiroIn):
    if not (body.data or "").strip():
        raise HTTPException(status_code=422, detail="A data do pagamento é obrigatória.")
    if not (body.recebedor or "").strip():
        raise HTTPException(status_code=422, detail="O nome de quem recebeu é obrigatório.")
    if body.forma_pagamento not in FORMAS:
        raise HTTPException(status_code=422, detail="Forma de pagamento inválida (Transferência, Multicaixa ou TPA).")
    if body.estado not in ESTADOS:
        raise HTTPException(status_code=422, detail="Estado inválido (Pago ou Pendente).")


@router.post("", status_code=201)
async def criar(body: PagamentoParceiroIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _validar(body)
    p = PagamentoParceiro(**body.model_dump(), created_by=current_user.id)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _dict(p)


@router.get("")
async def listar(
    cliente: Optional[str] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(PagamentoParceiro)
    if cliente:
        termo = f"%{cliente}%"
        q = q.where(PagamentoParceiro.cliente_referencia.ilike(termo) | PagamentoParceiro.recebedor.ilike(termo))
    if data_inicio:
        q = q.where(PagamentoParceiro.data >= data_inicio)
    if data_fim:
        q = q.where(PagamentoParceiro.data <= data_fim)
    if estado:
        q = q.where(PagamentoParceiro.estado == estado)
    q = q.order_by(PagamentoParceiro.data.desc(), PagamentoParceiro.id.desc())
    rows = (await db.execute(q)).scalars().all()
    itens = [_dict(p) for p in rows]
    total_pago = sum((p.valor or 0) for p in rows if p.estado == "Pago")
    total_pendente = sum((p.valor or 0) for p in rows if p.estado == "Pendente")
    return {
        "total": len(itens),
        "total_pago": round(total_pago, 2),
        "total_pendente": round(total_pendente, 2),
        "num_pagos": sum(1 for p in rows if p.estado == "Pago"),
        "num_pendentes": sum(1 for p in rows if p.estado == "Pendente"),
        "itens": itens,
    }


@router.put("/{pag_id}")
async def atualizar(pag_id: int, body: PagamentoParceiroIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _validar(body)
    p = (await db.execute(select(PagamentoParceiro).where(PagamentoParceiro.id == pag_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    for field, value in body.model_dump().items():
        setattr(p, field, value)
    await db.commit()
    await db.refresh(p)
    return _dict(p)


@router.delete("/{pag_id}", status_code=204)
async def eliminar(pag_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = (await db.execute(select(PagamentoParceiro).where(PagamentoParceiro.id == pag_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    await db.delete(p)
    await db.commit()
