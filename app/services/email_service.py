"""Email service for sending password reset and notifications."""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, username: str, reset_token: str) -> bool:
    """Send a password reset email. Returns True on success, False on failure."""
    reset_url = f"{settings.APP_URL}/#/reset-password?token={reset_token}"
    subject = "SIGMS ELOVITAL — Recuperação de Senha"
    body_html = f"""
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h2 style="color:#1a56db;margin:0">SIGMS ELOVITAL</h2>
    <p style="color:#6b7280;font-size:13px;margin:4px 0">Gestão de Mediação de Seguros — Angola</p>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px">
    <p>Olá <strong>{username}</strong>,</p>
    <p>Recebemos um pedido de recuperação de senha para a sua conta no SIGMS ELOVITAL.</p>
    <p>Clique no botão abaixo para definir uma nova senha. Este link é válido por <strong>30 minutos</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="{reset_url}"
         style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Repor Senha
      </a>
    </div>
    <p style="font-size:12px;color:#6b7280">
      Se não solicitou a recuperação de senha, ignore este email. A sua senha não será alterada.<br>
      Link directo: {reset_url}
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
    SIGMS ELOVITAL · Mediação de Seguros Angola
  </p>
</body>
</html>"""

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[email_service] SMTP não configurado. Token de reset para {to_email}: {reset_token}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"[email_service] Falha ao enviar email para {to_email}: {e}")
        return False
