"""APScheduler job definitions."""
import logging
from datetime import date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def job_renewal_alerts():
    """Mark policies due in 30 days and log alert."""
    from app.database import AsyncSessionLocal
    from app.models.apolice import Apolice
    from sqlalchemy import select
    threshold = (date.today() + timedelta(days=30)).isoformat()
    today = date.today().isoformat()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Apolice).where(
                Apolice.data_renovacao <= threshold,
                Apolice.data_renovacao >= today,
                Apolice.alerta_renovacao_enviado == False,
                Apolice.deleted_at.is_(None),
            )
        )
        apolices = result.scalars().all()
        for ap in apolices:
            ap.alerta_renovacao_enviado = True
            logger.info(f"Renewal alert: Apólice {ap.numero} vence em {ap.data_renovacao}")
        await db.commit()
    logger.info(f"Renewal alerts processed: {len(apolices)} apolices")


async def job_payment_d1_alerts():
    """Flag overdue payments (D+1)."""
    from app.database import AsyncSessionLocal
    from app.models.financeiro import Pagamento
    from sqlalchemy import select
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Pagamento).where(
                Pagamento.estado == "Pendente",
                Pagamento.data_vencimento <= yesterday,
                Pagamento.alerta_d1_enviado == False,
            )
        )
        pagamentos = result.scalars().all()
        for p in pagamentos:
            p.estado = "Atrasado"
            p.alerta_d1_enviado = True
            logger.info(f"Payment overdue: ID {p.id}")
        await db.commit()
    logger.info(f"D+1 alerts processed: {len(pagamentos)} payments")


def job_daily_backup():
    from app.services.backup_service import run_daily_backup
    run_daily_backup()


def start_scheduler():
    scheduler.add_job(job_renewal_alerts, "cron", hour=8, minute=0, id="renewal_alerts")
    scheduler.add_job(job_payment_d1_alerts, "cron", hour=9, minute=0, id="payment_d1")
    scheduler.add_job(job_daily_backup, "cron", hour=3, minute=0, id="daily_backup")
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown()
