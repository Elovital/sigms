"""Mapa Comparativo de Cotações — endpoint de envio por email."""
import asyncio
import logging
from functools import partial
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.email_service import send_generic_email

router = APIRouter(prefix="/cotacoes", tags=["cotacoes"])
logger = logging.getLogger(__name__)


class SeguradoraInfo(BaseModel):
    nome: str
    plano: Optional[str] = ""
    premio: Optional[float] = 0


class EnviarEmailIn(BaseModel):
    email: str
    mensagem: Optional[str] = ""
    html_content: str
    seguradoras: List[SeguradoraInfo]


@router.post("/enviar-email")
async def enviar_email_comparativo(
    body: EnviarEmailIn,
    current_user: User = Depends(get_current_user),
):
    segs_txt = ", ".join(
        s.nome for s in body.seguradoras if s.nome
    ) or "N/D"

    msg_extra = f"<p style='color:#374151'>{body.mensagem}</p>" if body.mensagem else ""

    html = f"""<!DOCTYPE html><html><head><meta charset='UTF-8'></head>
<body style='font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#111827'>
  <div style='text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #1a56db'>
    <h2 style='color:#1a56db;margin:0'>SIGMS ELOVITAL</h2>
    <p style='color:#6b7280;font-size:12px;margin:4px 0'>Gestão de Mediação de Seguros — Angola</p>
  </div>
  <h3 style='font-size:15px;color:#1f2937;margin-bottom:4px'>📊 Mapa Comparativo de Cotações — Seguro de Saúde</h3>
  <p style='font-size:12px;color:#6b7280;margin-bottom:16px'>Seguradoras comparadas: <strong>{segs_txt}</strong></p>
  {msg_extra}
  <div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:4px'>
    {body.html_content}
  </div>
  <p style='text-align:center;font-size:11px;color:#9ca3af;margin-top:20px'>
    Enviado por {current_user.username} via SIGMS ELOVITAL · Mediação de Seguros Angola
  </p>
</body></html>"""

    # Executar o envio SMTP numa thread separada para não bloquear o event loop
    loop = asyncio.get_event_loop()
    try:
        ok = await loop.run_in_executor(
            None,
            partial(
                send_generic_email,
                to_email=body.email,
                subject="Mapa Comparativo de Cotações — ELOVITAL",
                body_html=html,
            ),
        )
    except Exception as exc:
        logger.error(f"[cotacoes] Excepção ao enviar email: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro SMTP: {exc}")

    if not ok:
        raise HTTPException(status_code=500, detail="Falha ao enviar email. Verifique a configuração SMTP.")
    return {"ok": True}
