"""Daily SQLite backup service."""
import shutil
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

DB_PATH = Path("data/sigms.db")
BACKUP_DIR = Path("data/backups")


def run_daily_backup():
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = BACKUP_DIR / f"sigms_{timestamp}.db"
        if DB_PATH.exists():
            shutil.copy2(DB_PATH, dest)
            logger.info(f"Backup created: {dest}")
            # Keep only last 30 backups
            backups = sorted(BACKUP_DIR.glob("sigms_*.db"))
            for old in backups[:-30]:
                old.unlink()
        return str(dest)
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        raise
