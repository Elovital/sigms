"""Mapa Comparativo de Cotações — envio por email e histórico/acompanhamento."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from functools import partial
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.cotacao import CotacaoEnviada
from app.models.user import User
from app.services.email_service import send_generic_email

router = APIRouter(prefix="/cotacoes", tags=["cotacoes"])
logger = logging.getLogger(__name__)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SeguradoraInfo(BaseModel):
    nome: str
    plano: Optional[str] = ""
    premio: Optional[float] = 0


class EnviarEmailIn(BaseModel):
    email: str
    mensagem: Optional[str] = ""
    html_content: str
    seguradoras: List[SeguradoraInfo]
    tipo: Optional[str] = "saude"          # saude | auto
    cliente_nome: Optional[str] = ""
    veiculo_info: Optional[str] = ""


class CotacaoUpdate(BaseModel):
    estado: Optional[str] = None
    notas: Optional[str] = None
    proximo_contacto: Optional[str] = None
    cliente_nome: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _next_numero(db: AsyncSession) -> str:
    ano = datetime.now(timezone.utc).year
    count = (await db.execute(
        select(func.count()).select_from(CotacaoEnviada)
        .where(CotacaoEnviada.numero.like(f"COT-{ano}-%"))
    )).scalar() or 0
    return f"COT-{ano}-{count + 1:04d}"


def _cotacao_dict(c: CotacaoEnviada) -> dict:
    return {
        "id": c.id,
        "numero": c.numero,
        "tipo": c.tipo,
        "cliente_nome": c.cliente_nome,
        "email_destino": c.email_destino,
        "seguradoras": json.loads(c.seguradoras) if c.seguradoras else [],
        "premios": json.loads(c.premios) if c.premios else [],
        "veiculo_info": c.veiculo_info,
        "estado": c.estado,
        "notas": c.notas,
        "proximo_contacto": c.proximo_contacto,
        "created_by": c.user.username if c.user else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/enviar-email")
async def enviar_email_comparativo(
    body: EnviarEmailIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    segs_txt = ", ".join(s.nome for s in body.seguradoras if s.nome) or "N/D"
    tipo_label = "Seguro de Saúde" if body.tipo == "saude" else "Seguro Automóvel"
    msg_extra = f"<p style='color:#374151'>{body.mensagem}</p>" if body.mensagem else ""

    html = f"""<!DOCTYPE html><html><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#111827'>
  <div style='text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #1a56db'>
    <h2 style='color:#1a56db;margin:0'>ELOVITAL — Mediação de Seguros</h2>
    <p style='color:#6b7280;font-size:12px;margin:4px 0'>Gestão de Mediação de Seguros — Angola</p>
  </div>
  <h3 style='font-size:15px;color:#1f2937;margin-bottom:4px'>📊 Mapa Comparativo de Cotações — {tipo_label}</h3>
  <p style='font-size:12px;color:#6b7280;margin-bottom:16px'>Seguradoras comparadas: <strong>{segs_txt}</strong></p>
  {msg_extra}
  <div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:4px'>
    {body.html_content}
  </div>
  <p style='text-align:center;font-size:11px;color:#9ca3af;margin-top:20px'>
    Enviado por {current_user.username} via SIGMS ELOVITAL · cotacao@elovital-ao.com
  </p>
</body></html>"""

    # 1. Guardar SEMPRE o registo da cotação primeiro — assim reflecte na
    #    página de Cotações Enviadas mesmo que o envio do email falhe.
    numero = await _next_numero(db)
    segs_json  = json.dumps([s.nome  for s in body.seguradoras])
    prems_json = json.dumps([s.premio for s in body.seguradoras])
    cotacao = CotacaoEnviada(
        numero=numero,
        tipo=body.tipo or "saude",
        cliente_nome=body.cliente_nome or "",
        email_destino=body.email,
        seguradoras=segs_json,
        premios=prems_json,
        veiculo_info=body.veiculo_info or "",
        estado="Enviada",
        created_by=current_user.id,
    )
    db.add(cotacao)
    await db.commit()
    await db.refresh(cotacao)
    logger.info(f"[cotacoes] Cotação {numero} registada.")

    # 2. Tentar enviar o email — a falha não apaga o registo já guardado.
    loop = asyncio.get_event_loop()
    email_enviado = False
    try:
        email_enviado = bool(await loop.run_in_executor(
            None,
            partial(send_generic_email,
                    to_email=body.email,
                    subject=f"Mapa Comparativo de Cotações — {tipo_label} | ELOVITAL",
                    body_html=html),
        ))
    except Exception as exc:
        logger.error(f"[cotacoes] Cotação {numero} registada, mas email falhou: {exc}")

    if email_enviado:
        return {"ok": True, "numero": numero, "email_enviado": True}
    return {"ok": True, "numero": numero, "email_enviado": False,
            "aviso": "Cotação registada. O email não foi enviado — verifique a configuração SMTP."}


@router.get("/historico")
async def listar_cotacoes(
    skip: int = 0,
    limit: int = 50,
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(CotacaoEnviada).where(CotacaoEnviada.deleted_at.is_(None))
    if estado:
        q = q.where(CotacaoEnviada.estado == estado)
    if tipo:
        q = q.where(CotacaoEnviada.tipo == tipo)
    if search:
        term = f"%{search}%"
        q = q.where(
            CotacaoEnviada.cliente_nome.ilike(term) |
            CotacaoEnviada.email_destino.ilike(term) |
            CotacaoEnviada.numero.ilike(term)
        )
    q = q.order_by(CotacaoEnviada.created_at.desc()).offset(skip).limit(limit)

    rows = (await db.execute(q)).scalars().all()
    # eager load user
    for r in rows:
        _ = r.user
    return [_cotacao_dict(r) for r in rows]


@router.get("/historico/stats")
async def stats_cotacoes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (await db.execute(
        select(CotacaoEnviada.estado, func.count().label("n"))
        .where(CotacaoEnviada.deleted_at.is_(None))
        .group_by(CotacaoEnviada.estado)
    )).all()
    return {r.estado: r.n for r in rows}


@router.put("/historico/{cotacao_id}")
async def atualizar_cotacao(
    cotacao_id: int,
    body: CotacaoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cotacao = (await db.execute(
        select(CotacaoEnviada).where(
            CotacaoEnviada.id == cotacao_id,
            CotacaoEnviada.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not cotacao:
        raise HTTPException(status_code=404, detail="Cotação não encontrada.")

    if body.estado is not None:
        cotacao.estado = body.estado
    if body.notas is not None:
        cotacao.notas = body.notas
    if body.proximo_contacto is not None:
        cotacao.proximo_contacto = body.proximo_contacto
    if body.cliente_nome is not None:
        cotacao.cliente_nome = body.cliente_nome
    cotacao.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cotacao)
    _ = cotacao.user
    return _cotacao_dict(cotacao)


@router.delete("/historico/{cotacao_id}", status_code=204)
async def eliminar_cotacao(
    cotacao_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cotacao = (await db.execute(
        select(CotacaoEnviada).where(
            CotacaoEnviada.id == cotacao_id,
            CotacaoEnviada.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not cotacao:
        raise HTTPException(status_code=404, detail="Cotação não encontrada.")
    cotacao.deleted_at = datetime.now(timezone.utc)
    await db.commit()
