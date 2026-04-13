"""Email service — usa Brevo API (HTTP) se BREVO_API_KEY estiver definido,
caso contrário tenta SMTP (pode não funcionar em ambientes cloud como Render)."""
import json
import smtplib
import ssl
import logging
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Brevo HTTP API ──────────────────────────────────────────────────────────

def _send_brevo(to_email: str, subject: str, body_html: str) -> bool:
    """Enviar via Brevo API (recomendado em cloud — sem restrições de porta)."""
    payload = json.dumps({
        "sender":      {"name": settings.SMTP_FROM_NAME, "email": settings.SMTP_FROM},
        "to":          [{"email": to_email}],
        "subject":     subject,
        "htmlContent": body_html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept":       "application/json",
            "api-key":      settings.BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            logger.info(f"[email_service] Brevo OK → {to_email} (status {resp.status})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        logger.error(f"[email_service] Brevo HTTPError {e.code}: {body}")
        raise RuntimeError(f"Brevo API error {e.code}: {body}") from e
    except Exception as e:
        logger.error(f"[email_service] Brevo falhou: {type(e).__name__}: {e}")
        raise


# ─── SMTP fallback ────────────────────────────────────────────────────────────

def _send_smtp(to_email: str, msg: MIMEMultipart) -> bool:
    """Fallback SMTP — funciona localmente mas pode ser bloqueado em cloud."""
    port = int(settings.SMTP_PORT)
    try:
        if port == 465:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with smtplib.SMTP_SSL(settings.SMTP_HOST, port, context=ctx, timeout=15) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        else:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with smtplib.SMTP(settings.SMTP_HOST, port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"[email_service] SMTP falhou para {to_email}: {type(e).__name__}: {e}")
        raise


# ─── Interface pública ────────────────────────────────────────────────────────

def send_generic_email(to_email: str, subject: str, body_html: str) -> bool:
    """Enviar email HTML. Usa Brevo API se disponível, senão SMTP."""
    if settings.BREVO_API_KEY:
        return _send_brevo(to_email, subject, body_html)

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[email_service] Sem configuração de email. Mensagem para {to_email} não enviada.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(body_html, "html", "utf-8"))
    return _send_smtp(to_email, msg)


def send_password_reset_email(to_email: str, username: str, reset_token: str) -> bool:
    """Enviar email de recuperação de senha."""
    reset_url = f"{settings.APP_URL}/#/reset-password?token={reset_token}"
    subject = "SIGMS ELOVITAL — Recuperação de Senha"
    body_html = f"""<!DOCTYPE html><html>
<body style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h2 style="color:#1a56db;margin:0">SIGMS ELOVITAL</h2>
    <p style="color:#6b7280;font-size:13px;margin:4px 0">Gestão de Mediação de Seguros — Angola</p>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px">
    <p>Olá <strong>{username}</strong>,</p>
    <p>Recebemos um pedido de recuperação de senha. Clique abaixo para definir uma nova senha.
       Este link é válido por <strong>30 minutos</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="{reset_url}" style="background:#1a56db;color:#fff;padding:12px 28px;
         border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Repor Senha
      </a>
    </div>
    <p style="font-size:12px;color:#6b7280">
      Se não solicitou, ignore este email.<br>Link: {reset_url}
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
    SIGMS ELOVITAL · Mediação de Seguros Angola
  </p>
</body></html>"""
    return send_generic_email(to_email, subject, body_html)
