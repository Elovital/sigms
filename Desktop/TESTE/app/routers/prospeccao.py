"""Prospecção — pipeline de cotações e propostas."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.prospeccao import Prospeccao, CotacaoComparacao
from app.models.user import User

router = APIRouter(prefix="/prospeccao", tags=["prospeccao"])


class ProspeccaoIn(BaseModel):
    client_id: int
    seguradora_id: Optional[int] = None
    ramo_id: Optional[int] = None
    comparacao_id: Optional[int] = None
    titulo: str
    estado: str = "Nova"
    premio_estimado: Optional[float] = None
    percentagem_comissao: Optional[float] = None
    proteses_ortoses: Optional[str] = None  # "Incluída", "Excluída", ou descrição
    copagamento_fora_rede: Optional[float] = None  # Percentagem (%)
    periodo_carencia: Optional[int] = None  # Dias
    plano_numero: Optional[int] = None  # 1-4
    notas: Optional[str] = None
    data_seguimento: Optional[str] = None


class CotacaoComparacaoIn(BaseModel):
    client_id: int
    titulo: str
    data_seguimento: Optional[str] = None
    notas: Optional[str] = None


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
        "comparacao_id": p.comparacao_id,
        "titulo": p.titulo,
        "estado": p.estado,
        "premio_estimado": p.premio_estimado,
        "percentagem_comissao": p.percentagem_comissao,
        "comissao_estimada": comissao_estimada,
        "proteses_ortoses": p.proteses_ortoses,
        "copagamento_fora_rede": p.copagamento_fora_rede,
        "periodo_carencia": p.periodo_carencia,
        "plano_numero": p.plano_numero,
        "notas": p.notas,
        "data_seguimento": p.data_seguimento,
        "apolice_id": p.apolice_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _dict_comparacao(c: CotacaoComparacao) -> dict:
    return {
        "id": c.id,
        "client_id": c.client_id,
        "client_nome": c.client.nome if c.client else None,
        "client_nif": c.client.nif if c.client else None,
        "titulo": c.titulo,
        "data_seguimento": c.data_seguimento,
        "notas": c.notas,
        "prospeccoes": [_dict(p) for p in c.prospeccoes] if c.prospeccoes else [],
        "num_planos": len(c.prospeccoes) if c.prospeccoes else 0,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
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
    for field, value in body.model_dump().items():
        setattr(p, field, value)
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
    p.estado = estado
    if apolice_id:
        p.apolice_id = apolice_id
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


# ==================== COMPARAÇÃO DE COTAÇÕES ====================


@router.post("/comparacao", status_code=201)
async def create_comparacao(
    body: CotacaoComparacaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova comparação de cotações (agrupa até 4 planos)"""
    c = CotacaoComparacao(**body.model_dump(), created_by=current_user.id)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _dict_comparacao(c)


@router.get("/comparacao")
async def list_comparacoes(
    client_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as comparações de cotações"""
    stmt = select(CotacaoComparacao).where(CotacaoComparacao.deleted_at.is_(None))
    if client_id:
        stmt = stmt.where(CotacaoComparacao.client_id == client_id)
    if q:
        stmt = stmt.where(CotacaoComparacao.titulo.ilike(f"%{q}%"))
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(CotacaoComparacao.created_at.desc())
    result = await db.execute(stmt)
    return {"total": total, "page": page, "size": size, "items": [_dict_comparacao(c) for c in result.scalars().all()]}


@router.get("/comparacao/{comp_id}")
async def get_comparacao(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém detalhes de uma comparação específica com seus planos"""
    result = await db.execute(
        select(CotacaoComparacao).where(CotacaoComparacao.id == comp_id, CotacaoComparacao.deleted_at.is_(None))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Comparação não encontrada")
    return _dict_comparacao(c)


@router.put("/comparacao/{comp_id}")
async def update_comparacao(
    comp_id: int,
    body: CotacaoComparacaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma comparação de cotações"""
    result = await db.execute(
        select(CotacaoComparacao).where(CotacaoComparacao.id == comp_id, CotacaoComparacao.deleted_at.is_(None))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Comparação não encontrada")
    for field, value in body.model_dump().items():
        setattr(c, field, value)
    await db.commit()
    await db.refresh(c)
    return _dict_comparacao(c)


@router.delete("/comparacao/{comp_id}", status_code=204)
async def delete_comparacao(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apaga uma comparação de cotações (soft delete)"""
    from datetime import datetime, timezone
    result = await db.execute(select(CotacaoComparacao).where(CotacaoComparacao.id == comp_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Comparação não encontrada")
    c.deleted_at = datetime.now(timezone.utc)
    await db.commit()
