"""Dashboard KPI and chart data endpoints."""
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.dependencies import get_current_user
from app.models.apolice import Apolice, Ramo
from app.models.financeiro import Premio, Comissao, Pagamento
from app.models.sinistro import Sinistro
from app.models.client import Client
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _dt(d: date) -> datetime:
    """Converter date em datetime UTC aware para comparações com DateTime(timezone=True)."""
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


@router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    first_of_month_dt = _dt(today.replace(day=1))
    threshold_30_str  = (today + timedelta(days=30)).isoformat()
    today_str         = today.isoformat()

    # Produção mensal
    prod_result = await db.execute(
        select(func.sum(Premio.premio_base)).where(Premio.created_at >= first_of_month_dt)
    )
    producao_mensal = round(prod_result.scalar() or 0.0, 2)

    # Apólices ativas
    total_ativas = (await db.execute(
        select(func.count()).where(Apolice.estado == "Ativa", Apolice.deleted_at.is_(None))
    )).scalar() or 0

    # Renovações em 30 dias
    renovacoes = (await db.execute(
        select(func.count()).where(
            Apolice.data_renovacao >= today_str,
            Apolice.data_renovacao <= threshold_30_str,
            Apolice.deleted_at.is_(None),
            Apolice.estado == "Ativa",
        )
    )).scalar() or 0

    # Sinistros ativos
    sinistros_ativos = (await db.execute(
        select(func.count()).where(Sinistro.estado.in_(["Aberto", "Em Analise", "Em Regularizacao"]))
    )).scalar() or 0

    # Total clientes
    total_clients = (await db.execute(
        select(func.count()).where(Client.deleted_at.is_(None))
    )).scalar() or 0

    # Pagamentos pendentes / atrasados
    pagamentos_pendentes = (await db.execute(
        select(func.count()).where(Pagamento.estado.in_(["Pendente", "Atrasado"]))
    )).scalar() or 0

    pagamentos_atrasados = (await db.execute(
        select(func.count()).where(Pagamento.estado == "Atrasado")
    )).scalar() or 0

    # Taxa de retenção
    total_apolices = (await db.execute(
        select(func.count()).where(Apolice.deleted_at.is_(None))
    )).scalar() or 1
    taxa_retencao = round(total_ativas / total_apolices * 100, 1) if total_apolices > 0 else 0.0

    return {
        "producao_mensal": producao_mensal,
        "total_apolices_ativas": total_ativas,
        "taxa_retencao": taxa_retencao,
        "renovacoes_30_dias": renovacoes,
        "sinistros_ativos": sinistros_ativos,
        "total_clientes": total_clients,
        "pagamentos_pendentes": pagamentos_pendentes,
        "pagamentos_atrasados": pagamentos_atrasados,
    }


@router.get("/charts/ramos")
async def chart_ramos(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Ramo.nome, Ramo.codigo, func.count(Apolice.id).label("count"), func.sum(Premio.premio_total).label("total_premio"))
        .join(Apolice, Apolice.ramo_id == Ramo.id)
        .outerjoin(Premio, Premio.apolice_id == Apolice.id)
        .where(Apolice.deleted_at.is_(None), Apolice.estado == "Ativa")
        .group_by(Ramo.id, Ramo.nome, Ramo.codigo)
        .order_by(func.count(Apolice.id).desc())
    )
    rows = result.all()
    return [{"ramo": r.nome, "codigo": r.codigo, "count": r.count, "total_premio": round(r.total_premio or 0, 2)} for r in rows]


@router.get("/charts/comissoes")
async def chart_comissoes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Últimos 12 meses de cash flow — compatível com PostgreSQL."""
    # Gerar lista dos últimos 12 meses (YYYY-MM)
    months = []
    for i in range(11, -1, -1):
        d = date.today().replace(day=1) - timedelta(days=i * 30)
        months.append(d.strftime("%Y-%m"))

    # Ir buscar todas as comissões com data_referencia (campo String YYYY-MM-DD)
    # e agregar em Python — compatível com qualquer BD
    result_prev = await db.execute(
        select(Comissao.data_referencia, func.sum(Comissao.valor).label("total"))
        .where(Comissao.estado == "Prevista")
        .group_by(Comissao.data_referencia)
    )
    result_rec = await db.execute(
        select(Comissao.data_referencia, func.sum(Comissao.valor).label("total"))
        .where(Comissao.estado == "Recebida")
        .group_by(Comissao.data_referencia)
    )

    def to_month(val) -> str:
        if val is None:
            return ""
        s = str(val)
        return s[:7]  # "YYYY-MM"

    previstas_map: dict[str, float] = {}
    for r in result_prev.all():
        m = to_month(r.data_referencia)
        previstas_map[m] = round((previstas_map.get(m, 0) + (r.total or 0)), 2)

    recebidas_map: dict[str, float] = {}
    for r in result_rec.all():
        m = to_month(r.data_referencia)
        recebidas_map[m] = round((recebidas_map.get(m, 0) + (r.total or 0)), 2)

    return [{"month": m, "previstas": previstas_map.get(m, 0.0), "recebidas": recebidas_map.get(m, 0.0)} for m in months]


@router.get("/quick-actions")
async def quick_actions(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today().isoformat()
    threshold_30 = (date.today() + timedelta(days=30)).isoformat()

    renew_result = await db.execute(
        select(Apolice, Client).join(Client, Client.id == Apolice.client_id)
        .where(
            Apolice.data_renovacao >= today,
            Apolice.data_renovacao <= threshold_30,
            Apolice.deleted_at.is_(None),
            Apolice.estado == "Ativa",
        ).order_by(Apolice.data_renovacao).limit(10)
    )

    renovacoes = []
    for ap, cl in renew_result.all():
        contact = next((c for c in cl.contacts if c.principal), None) or (cl.contacts[0] if cl.contacts else None)
        renovacoes.append({
            "tipo": "renovacao", "apolice_numero": ap.numero,
            "client_nome": cl.nome, "data_renovacao": ap.data_renovacao,
            "telefone": contact.valor if contact and contact.tipo in ("telefone", "telemovel") else None,
            "email": next((c.valor for c in cl.contacts if c.tipo == "email"), None),
        })

    return {"renovacoes": renovacoes}
