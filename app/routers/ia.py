"""IA Insights — computed recommendations from live SIGMS data."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.apolice import Apolice, Ramo
from app.models.sinistro import Sinistro
from app.models.client import Client
from app.models.financeiro import Premio, Pagamento, Comissao
from app.models.user import User

router = APIRouter(prefix="/ia", tags=["ia"])


@router.get("/insights")
async def get_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    today_str = today.isoformat()
    t30 = (today + timedelta(days=30)).isoformat()
    t7 = (today + timedelta(days=7)).isoformat()

    # ── Follow-ups ─────────────────────────────────────────────────────────────
    # 1. Renovações próximas (30 dias)
    renew_rows = (await db.execute(
        select(Apolice, Client)
        .join(Client, Client.id == Apolice.client_id)
        .where(
            Apolice.data_renovacao >= today_str,
            Apolice.data_renovacao <= t30,
            Apolice.deleted_at.is_(None),
            Apolice.estado == "Ativa",
        )
        .order_by(Apolice.data_renovacao)
        .limit(5)
    )).all()

    follow_ups = []
    for ap, cl in renew_rows:
        dias = (date.fromisoformat(ap.data_renovacao) - today).days
        prioridade = "alta" if dias <= 7 else "media"
        follow_ups.append({
            "cliente": cl.nome,
            "dias": dias,
            "acao": f"Renovação apólice {ap.numero} em {dias}d",
            "prioridade": prioridade,
        })

    # 2. Pagamentos atrasados sem seguimento
    late_rows = (await db.execute(
        select(Pagamento, Premio, Apolice, Client)
        .join(Premio, Premio.id == Pagamento.premio_id)
        .join(Apolice, Apolice.id == Premio.apolice_id)
        .join(Client, Client.id == Apolice.client_id)
        .where(
            Pagamento.estado == "Atrasado",
            Apolice.deleted_at.is_(None),
        )
        .order_by(Pagamento.data_vencimento)
        .limit(5)
    )).all()

    for pag, prem, ap, cl in late_rows:
        if not any(f["cliente"] == cl.nome for f in follow_ups):
            follow_ups.append({
                "cliente": cl.nome,
                "dias": None,
                "acao": f"Pagamento atrasado — {pag.valor:,.0f} AKZ",
                "prioridade": "alta",
            })

    # ── Sentimento (score baseado em comportamento de pagamentos) ────────────
    # Por cliente: score = 100 − 20*atrasos − 10*pendentes + 10*pagos_a_tempo
    client_rows = (await db.execute(
        select(Client)
        .where(Client.deleted_at.is_(None))
        .order_by(Client.nome)
        .limit(8)
    )).scalars().all()

    sentimento = []
    for cl in client_rows:
        # Count pagamentos by estado for this client
        pags = (await db.execute(
            select(Pagamento.estado, func.count().label("n"))
            .join(Premio, Premio.id == Pagamento.premio_id)
            .join(Apolice, Apolice.id == Premio.apolice_id)
            .where(Apolice.client_id == cl.id, Apolice.deleted_at.is_(None))
            .group_by(Pagamento.estado)
        )).all()

        pago = next((r.n for r in pags if r.estado == "Pago"), 0)
        pendente = next((r.n for r in pags if r.estado == "Pendente"), 0)
        atrasado = next((r.n for r in pags if r.estado == "Atrasado"), 0)
        total = pago + pendente + atrasado or 1

        score = min(100, max(0, round(
            (pago / total) * 80 + 20 - atrasado * 15 - pendente * 3
        )))
        if score >= 65:
            label, color = "Positivo", "#057a55"
        elif score >= 40:
            label, color = "Neutro", "#c27803"
        else:
            label, color = "Negativo", "#c81e1e"

        sentimento.append({"cliente": cl.nome, "score": score, "label": label, "color": color})

    sentimento.sort(key=lambda x: -x["score"])

    # ── Sinistralidade por Ramo ───────────────────────────────────────────────
    ramo_rows = (await db.execute(
        select(
            Ramo.nome,
            func.count(Apolice.id).label("total_apolices"),
            func.sum(Premio.premio_total).label("total_premios"),
            func.sum(Sinistro.valor_estimado).label("total_sinistros"),
        )
        .join(Apolice, Apolice.ramo_id == Ramo.id, isouter=True)
        .outerjoin(Premio, Premio.apolice_id == Apolice.id)
        .outerjoin(Sinistro, Sinistro.apolice_id == Apolice.id)
        .where(Apolice.deleted_at.is_(None))
        .group_by(Ramo.id)
    )).all()

    sinistralidade = []
    for r in ramo_rows:
        premios = r.total_premios or 0
        sins = r.total_sinistros or 0
        loss_ratio = round(sins / premios * 100, 1) if premios > 0 else 0.0
        sinistralidade.append({
            "ramo": r.nome,
            "loss_ratio": loss_ratio,
            "total_apolices": r.total_apolices or 0,
            "alerta": loss_ratio >= 65,
        })
    sinistralidade.sort(key=lambda x: -x["loss_ratio"])

    # ── Próximas Ações ────────────────────────────────────────────────────────
    proximas_acoes = []

    # Renovações urgentes (7 dias)
    urgentes = [f for f in follow_ups if f.get("dias") is not None and f["dias"] <= 7]
    if urgentes:
        proximas_acoes.append({
            "tipo": "renovacao",
            "icon": "🔄",
            "descricao": f"Contactar {len(urgentes)} cliente(s) com renovação em menos de 7 dias",
            "prioridade": "alta",
        })

    # Pagamentos atrasados
    late_count = (await db.execute(
        select(func.count()).where(Pagamento.estado == "Atrasado")
    )).scalar() or 0
    if late_count:
        proximas_acoes.append({
            "tipo": "pagamento",
            "icon": "💳",
            "descricao": f"Regularizar {late_count} pagamento(s) em atraso",
            "prioridade": "alta",
        })

    # Renovações nos próximos 30 dias (geral)
    renov_count = len(renew_rows)
    if renov_count:
        proximas_acoes.append({
            "tipo": "followup",
            "icon": "📩",
            "descricao": f"Enviar follow-up de renovação para {renov_count} apólice(s) nos próximos 30 dias",
            "prioridade": "media",
        })

    # Ramos em alerta de sinistralidade
    ramos_alerta = [s["ramo"] for s in sinistralidade if s["alerta"]]
    if ramos_alerta:
        proximas_acoes.append({
            "tipo": "sinistralidade",
            "icon": "⚠️",
            "descricao": f"Rever exposição em {', '.join(ramos_alerta[:3])} — Loss Ratio acima de 65%",
            "prioridade": "media",
        })

    return {
        "follow_ups": follow_ups[:6],
        "sentimento": sentimento[:6],
        "sinistralidade": sinistralidade,
        "proximas_acoes": proximas_acoes,
    }
