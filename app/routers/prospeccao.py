"""Prospecção — pipeline de cotações e propostas."""
from typing import Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.prospeccao import Prospeccao
from app.models.acompanhamento import Interacao
from app.models.user import User

router = APIRouter(prefix="/prospeccao", tags=["prospeccao"])

ESTADO_AGUARDA_CLIENTE = "Aguarda Cliente"


async def _criar_seguimento_aguarda_cliente(db: AsyncSession, p: Prospeccao, user_id: int | None):
    """Cria automaticamente uma tarefa de acompanhamento quando a prospecção
    passa a 'Aguarda Cliente'. O alerta é agendado para 15 dias após a emissão.
    Evita duplicados se já existir um lembrete activo para esta prospecção."""
    assunto = f"Seguimento de prospecção #{p.id}: {p.titulo}"
    existe = await db.execute(
        select(Interacao).where(Interacao.assunto == assunto, Interacao.lembrete_ativo == True)
    )
    if existe.scalar_one_or_none():
        return
    hoje = date.today()
    db.add(Interacao(
        client_id=p.client_id,
        tipo="Chamada",
        data_interacao=hoje.isoformat(),
        assunto=assunto,
        notas="Tarefa criada automaticamente — prospecção em 'Aguarda Cliente'. Alerta 15 dias após a emissão.",
        proximo_contacto=(hoje + timedelta(days=15)).isoformat(),
        lembrete_ativo=True,
        created_by=user_id,
    ))


class ProspeccaoIn(BaseModel):
    client_id: int
    seguradora_id: Optional[int] = None
    ramo_id: Optional[int] = None
    titulo: str
    estado: str = "Nova"
    premio_estimado: Optional[float] = None
    percentagem_comissao: Optional[float] = None
    notas: Optional[str] = None
    data_seguimento: Optional[str] = None


def _dict(p: Prospeccao) -> dict:
    comissao_estimada = None
    if p.premio_estimado and p.percentagem_comissao:
        comissao_estimada = round(p.premio_estimado * p.percentagem_comissao / 100, 2)
    return {
        "id": p.id,
        "client_id": p.client_id,
        "client_nome": p.client.nome if p.client else None,
        "client_nif": p.client.nif if p.client else None,
        "seguradora_id": p.seguradora_id,
        "seguradora": p.seguradora.nome if p.seguradora else None,
        "ramo_id": p.ramo_id,
        "ramo": p.ramo.nome if p.ramo else None,
        "ramo_codigo": p.ramo.codigo if p.ramo else None,
        "titulo": p.titulo,
        "estado": p.estado,
        "premio_estimado": p.premio_estimado,
        "percentagem_comissao": p.percentagem_comissao,
        "comissao_estimada": comissao_estimada,
        "notas": p.notas,
        "data_seguimento": p.data_seguimento,
        "apolice_id": p.apolice_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("")
async def list_prospeccoes(
    estado: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Prospeccao).where(Prospeccao.deleted_at.is_(None))
    if estado:
        stmt = stmt.where(Prospeccao.estado == estado)
    if client_id:
        stmt = stmt.where(Prospeccao.client_id == client_id)
    if q:
        stmt = stmt.where(Prospeccao.titulo.ilike(f"%{q}%"))
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Prospeccao.created_at.desc())
    result = await db.execute(stmt)
    return {"total": total, "page": page, "size": size, "items": [_dict(p) for p in result.scalars().all()]}


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Contagem por estado para o funil."""
    result = await db.execute(
        select(Prospeccao.estado, func.count(Prospeccao.id).label("count"))
        .where(Prospeccao.deleted_at.is_(None))
        .group_by(Prospeccao.estado)
    )
    counts = {r.estado: r.count for r in result.all()}
    return counts


@router.post("", status_code=201)
async def create_prospeccao(
    body: ProspeccaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = Prospeccao(**body.model_dump(), created_by=current_user.id)
    db.add(p)
    await db.flush()
    if p.estado == ESTADO_AGUARDA_CLIENTE:
        await _criar_seguimento_aguarda_cliente(db, p, current_user.id)
    await db.commit()
    await db.refresh(p)
    return _dict(p)


@router.get("/{prosp_id}")
async def get_prospeccao(
    prosp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Prospeccao).where(Prospeccao.id == prosp_id, Prospeccao.deleted_at.is_(None)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospecção não encontrada")
    return _dict(p)


@router.put("/{prosp_id}")
async def update_prospeccao(
    prosp_id: int,
    body: ProspeccaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Prospeccao).where(Prospeccao.id == prosp_id, Prospeccao.deleted_at.is_(None)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospecção não encontrada")
    estado_anterior = p.estado
    for field, value in body.model_dump().items():
        setattr(p, field, value)
    if p.estado == ESTADO_AGUARDA_CLIENTE and estado_anterior != ESTADO_AGUARDA_CLIENTE:
        await _criar_seguimento_aguarda_cliente(db, p, current_user.id)
    await db.commit()
    await db.refresh(p)
    return _dict(p)


@router.patch("/{prosp_id}/estado")
async def update_estado(
    prosp_id: int,
    estado: str = Query(...),
    apolice_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Prospeccao).where(Prospeccao.id == prosp_id, Prospeccao.deleted_at.is_(None)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospecção não encontrada")
    estado_anterior = p.estado
    p.estado = estado
    if apolice_id:
        p.apolice_id = apolice_id
    if estado == ESTADO_AGUARDA_CLIENTE and estado_anterior != ESTADO_AGUARDA_CLIENTE:
        await _criar_seguimento_aguarda_cliente(db, p, current_user.id)
    await db.commit()
    await db.refresh(p)
    return _dict(p)


@router.delete("/{prosp_id}", status_code=204)
async def delete_prospeccao(
    prosp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Prospeccao).where(Prospeccao.id == prosp_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prospecção não encontrada")
    p.deleted_at = datetime.now(timezone.utc)
    await db.commit()
