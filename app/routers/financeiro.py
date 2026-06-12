"""Financial endpoints: premios, pagamentos, comissoes."""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.financeiro import Premio, Pagamento, Comissao
from app.models.apolice import Apolice
from app.models.user import User
from app.services.financeiro_service import (
    calcular_imposto, calcular_premio_total, calcular_parcelas,
    get_comissao_percentagem, calcular_comissao
)

router = APIRouter(prefix="/financeiro", tags=["financeiro"])


class PremioIn(BaseModel):
    apolice_id: int
    fracionamento: str = "Anual"
    premio_base: float
    encargos: float = 0.0
    periodo_inicio: str
    periodo_fim: str
    percentagem_comissao: Optional[float] = None
    tipo_comissao: str = "angariacao"
    ramo_codigo: str = "AUTO"


class PagamentoUpdate(BaseModel):
    estado: str
    data_pagamento: Optional[str] = None
    metodo: Optional[str] = None
    referencia: Optional[str] = None


class ComissaoUpdate(BaseModel):
    estado: str


@router.post("/premios", status_code=201)
async def create_premio(body: PremioIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_ = calcular_imposto(body.premio_base, body.encargos)
    total = calcular_premio_total(body.premio_base, body.encargos, is_)
    parcelas = calcular_parcelas(body.fracionamento, total)

    premio = Premio(
        apolice_id=body.apolice_id, fracionamento=body.fracionamento,
        premio_base=body.premio_base, encargos=body.encargos,
        imposto_selo=is_, premio_total=total,
        periodo_inicio=body.periodo_inicio, periodo_fim=body.periodo_fim,
    )
    db.add(premio)
    await db.flush()

    # Create payment instalments
    from dateutil.relativedelta import relativedelta
    from datetime import datetime
    fracionamento_map = {"Anual": 12, "Semestral": 6, "Trimestral": 3, "Mensal": 1}
    months = fracionamento_map.get(body.fracionamento, 12)
    start = datetime.strptime(body.periodo_inicio, "%Y-%m-%d")
    for i, valor in enumerate(parcelas):
        due_date = start + relativedelta(months=months * i)
        db.add(Pagamento(premio_id=premio.id, data_vencimento=due_date.strftime("%Y-%m-%d"), valor=valor))

    # Create commission
    pct = body.percentagem_comissao or get_comissao_percentagem(body.ramo_codigo, body.tipo_comissao)
    valor_comissao = calcular_comissao(total, pct)
    db.add(Comissao(
        apolice_id=body.apolice_id, tipo=body.tipo_comissao,
        percentagem=pct, valor=valor_comissao, data_referencia=body.periodo_inicio,
    ))

    await db.commit()
    await db.refresh(premio)
    return {
        "id": premio.id, "apolice_id": premio.apolice_id,
        "premio_base": premio.premio_base, "encargos": premio.encargos,
        "imposto_selo": premio.imposto_selo, "premio_total": premio.premio_total,
        "fracionamento": premio.fracionamento, "parcelas": len(parcelas),
    }


@router.get("/pagamentos")
async def list_pagamentos(
    estado: Optional[str] = Query(None),
    apolice_id: Optional[int] = Query(None),
    vencimento_ate: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Pagamento)
    if estado:
        stmt = stmt.where(Pagamento.estado == estado)
    if vencimento_ate:
        stmt = stmt.where(Pagamento.data_vencimento <= vencimento_ate)
    if apolice_id:
        stmt = stmt.join(Premio).where(Premio.apolice_id == apolice_id)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Pagamento.data_vencimento)
    result = await db.execute(stmt)
    pagamentos = result.scalars().all()
    # Enrich with apolice_numero
    premio_ids = list({p.premio_id for p in pagamentos})
    apolice_map: dict[int, str] = {}
    if premio_ids:
        pr = await db.execute(select(Premio.id, Premio.apolice_id).where(Premio.id.in_(premio_ids)))
        premio_to_apolice = {row.id: row.apolice_id for row in pr.all()}
        apolice_ids = list(set(premio_to_apolice.values()))
        if apolice_ids:
            ar = await db.execute(select(Apolice.id, Apolice.numero).where(Apolice.id.in_(apolice_ids)))
            id_to_num = {row.id: row.numero for row in ar.all()}
            apolice_map = {pid: id_to_num.get(aid, '') for pid, aid in premio_to_apolice.items()}
    return {
        "total": total, "items": [{
            "id": p.id, "premio_id": p.premio_id,
            "apolice_numero": apolice_map.get(p.premio_id, ''),
            "data_vencimento": p.data_vencimento,
            "data_pagamento": p.data_pagamento, "valor": p.valor, "estado": p.estado,
            "metodo": p.metodo, "referencia": p.referencia,
        } for p in pagamentos]
    }


@router.put("/pagamentos/{pag_id}")
async def update_pagamento(pag_id: int, body: PagamentoUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Pagamento).where(Pagamento.id == pag_id))
    pag = result.scalar_one_or_none()
    if not pag:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    pag.estado = body.estado
    if body.data_pagamento:
        pag.data_pagamento = body.data_pagamento
    if body.metodo:
        pag.metodo = body.metodo
    if body.referencia:
        pag.referencia = body.referencia
    await db.commit()
    return {"id": pag.id, "estado": pag.estado, "data_pagamento": pag.data_pagamento}


@router.get("/comissoes")
async def list_comissoes(
    estado: Optional[str] = Query(None),
    apolice_id: Optional[int] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Comissao)
    if estado:
        stmt = stmt.where(Comissao.estado == estado)
    if apolice_id:
        stmt = stmt.where(Comissao.apolice_id == apolice_id)
    if data_inicio:
        stmt = stmt.where(Comissao.data_referencia >= data_inicio)
    if data_fim:
        stmt = stmt.where(Comissao.data_referencia <= data_fim)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Comissao.data_referencia.desc())
    result = await db.execute(stmt)
    comissoes = result.scalars().all()
    apolice_ids = list({c.apolice_id for c in comissoes})
    num_map: dict[int, str] = {}
    if apolice_ids:
        ar = await db.execute(select(Apolice.id, Apolice.numero).where(Apolice.id.in_(apolice_ids)))
        num_map = {row.id: row.numero for row in ar.all()}
    return {
        "total": total, "items": [{
            "id": c.id, "apolice_id": c.apolice_id,
            "apolice_numero": num_map.get(c.apolice_id, ''),
            "tipo": c.tipo,
            "percentagem": c.percentagem, "valor": c.valor,
            "data_referencia": c.data_referencia, "estado": c.estado,
        } for c in comissoes]
    }


@router.put("/comissoes/{com_id}")
async def update_comissao(com_id: int, body: ComissaoUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Comissao).where(Comissao.id == com_id))
    com = result.scalar_one_or_none()
    if not com:
        raise HTTPException(status_code=404, detail="Comissão não encontrada")
    com.estado = body.estado
    await db.commit()
    return {"id": com.id, "estado": com.estado}


@router.get("/summary")
async def financial_summary(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today().isoformat()
    first_of_month = date.today().replace(day=1).isoformat()

    total_premios = (await db.execute(select(func.sum(Premio.premio_base)))).scalar() or 0.0
    comissoes_previstas = (await db.execute(select(func.sum(Comissao.valor)).where(Comissao.estado == "Prevista"))).scalar() or 0.0
    comissoes_recebidas = (await db.execute(select(func.sum(Comissao.valor)).where(Comissao.estado == "Recebida"))).scalar() or 0.0
    comissoes_pagas = (await db.execute(select(func.sum(Comissao.valor)).where(Comissao.estado == "Paga"))).scalar() or 0.0
    pagamentos_atrasados = (await db.execute(select(func.count()).where(Pagamento.estado == "Atrasado"))).scalar() or 0

    return {
        "total_premios": round(total_premios, 2),
        "comissoes_previstas": round(comissoes_previstas, 2),
        "comissoes_recebidas": round(comissoes_recebidas, 2),
        "comissoes_pagas": round(comissoes_pagas, 2),
        "pagamentos_atrasados": pagamentos_atrasados,
    }


@router.get("/compliance")
async def get_compliance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compliance dashboard: ISS, Imposto Selo, ARSEG deadlines, anomalies."""
    from datetime import timedelta
    from app.models.apolice import Apolice
    from app.models.client import Client

    today = date.today()
    first_of_month = today.replace(day=1)
    first_of_year = today.replace(month=1, day=1)

    # ISS total acumulado no ano (2% sobre comissões recebidas)
    comissoes_ano = (await db.execute(
        select(func.sum(Comissao.valor))
        .where(Comissao.estado == "Recebida", Comissao.data_referencia >= first_of_year.isoformat())
    )).scalar() or 0.0
    iss_estimado = round(comissoes_ano * 0.02, 2)

    # Imposto Selo acumulado no ano (prémios × 0.3%)
    premios_ano = (await db.execute(
        select(func.sum(Premio.premio_base))
        .where(Premio.created_at >= first_of_year.isoformat())
    )).scalar() or 0.0
    imposto_selo_estimado = round(premios_ano * 0.003, 2)

    # Comissões não reconciliadas (Previstas com mais de 60 dias)
    cutoff_60 = (today - timedelta(days=60)).isoformat()
    comissoes_vencidas = (await db.execute(
        select(func.count())
        .where(Comissao.estado == "Prevista", Comissao.data_referencia <= cutoff_60)
    )).scalar() or 0

    # Apólices sem prémio registado
    apolices_sem_premio = (await db.execute(
        select(func.count(Apolice.id))
        .outerjoin(Premio, Premio.apolice_id == Apolice.id)
        .where(Apolice.estado == "Ativa", Apolice.deleted_at.is_(None), Premio.id.is_(None))
    )).scalar() or 0

    # Pagamentos atrasados > 30 dias
    cutoff_30 = (today - timedelta(days=30)).isoformat()
    pagamentos_criticos = (await db.execute(
        select(func.count())
        .where(Pagamento.estado == "Atrasado", Pagamento.data_vencimento <= cutoff_30)
    )).scalar() or 0

    # Próximos prazos ARSEG (fixos por regulamento angolano)
    year = today.year
    arseg_deadlines = [
        {"prazo": f"{year}-03-31", "descricao": "Mapa Anual de Produção — ARSEG", "tipo": "ARSEG"},
        {"prazo": f"{year}-06-30", "descricao": "Relatório Semestral de Comissões — ARSEG", "tipo": "ARSEG"},
        {"prazo": f"{year}-09-30", "descricao": "Mapa de Sinistros 1º Semestre — ARSEG", "tipo": "ARSEG"},
        {"prazo": f"{year}-12-31", "descricao": "Relatório Anual de Atividade — ARSEG", "tipo": "ARSEG"},
        {"prazo": f"{today.year}-{today.month:02d}-{25:02d}", "descricao": "Declaração Mensal de ISS (até dia 25)", "tipo": "ISS"},
    ]
    for d in arseg_deadlines:
        diff = (date.fromisoformat(d["prazo"]) - today).days
        d["dias_restantes"] = diff
        d["estado"] = "vencido" if diff < 0 else "urgente" if diff <= 15 else "ok"

    arseg_deadlines.sort(key=lambda x: x["prazo"])

    return {
        "iss_estimado": iss_estimado,
        "imposto_selo_estimado": imposto_selo_estimado,
        "comissoes_vencidas": comissoes_vencidas,
        "apolices_sem_premio": apolices_sem_premio,
        "pagamentos_criticos": pagamentos_criticos,
        "arseg_deadlines": arseg_deadlines,
    }
