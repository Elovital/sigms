"""
Camada de base de dados — SIGMS ELOVITAL.

Motores suportados:
  - PostgreSQL (asyncpg): produção — dados persistem independentemente de restarts.
      DATABASE_URL = postgresql+asyncpg://user:pass@host:5432/dbname
  - SQLite (aiosqlite): desenvolvimento local APENAS.
      DATABASE_URL = sqlite+aiosqlite:///./data/sigms.db   (caminho relativo)
      ⚠ NÃO usar SQLite com caminho absoluto em Render/cloud — o disco é efémero
        e TODOS OS DADOS SÃO APAGADOS em cada restart.

Configuração via variável de ambiente DATABASE_URL.
"""
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)


# ─── Validação preventiva ──────────────────────────────────────────────────────

_url: str = settings.DATABASE_URL

def _warn_sqlite_production() -> None:
    """Emite aviso claro se SQLite absoluto for usado (dados efémeros em cloud)."""
    if not _url.startswith("sqlite"):
        return
    # Caminhos absolutos em cloud = efémeros (ex: /app/data/sigms.db no Render)
    is_absolute = (
        "sqlite+aiosqlite:////" in _url or          # 4 barras = caminho absoluto
        _url.startswith("sqlite:////") or
        (not _url.startswith("sqlite+aiosqlite:///./") and "/" in _url.split("sqlite+aiosqlite:///")[-1].lstrip("./"))
    )
    if is_absolute:
        logger.warning(
            "\n"
            "╔══════════════════════════════════════════════════════════╗\n"
            "║  ⚠  AVISO CRÍTICO DE PERSISTÊNCIA DE DADOS              ║\n"
            "║                                                          ║\n"
            "║  A usar SQLite com caminho absoluto:                     ║\n"
            f"║  {_url[:50]:<50}  ║\n"
            "║                                                          ║\n"
            "║  Em ambientes cloud sem disco persistente (Render free,  ║\n"
            "║  Fly.io, Railway free, etc.) TODOS OS DADOS SÃO          ║\n"
            "║  APAGADOS em cada restart/deploy.                        ║\n"
            "║                                                          ║\n"
            "║  ✅ SOLUÇÃO: Definir DATABASE_URL com PostgreSQL.        ║\n"
            "║     Opções gratuitas: supabase.com  ou  neon.tech        ║\n"
            "╚══════════════════════════════════════════════════════════╝"
        )
    else:
        logger.info("[SIGMS] Base de dados: SQLite local (desenvolvimento)")

_warn_sqlite_production()


# ─── Engine e sessão ───────────────────────────────────────────────────────────

def _build_engine(url: str):
    """Criar engine SQLAlchemy com parâmetros optimizados por driver."""
    connect_args: dict = {}
    engine_kwargs: dict = {}

    if url.startswith("postgresql"):
        import ssl as _ssl
        ssl_ctx = _ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = _ssl.CERT_NONE
        connect_args = {
            "ssl": ssl_ctx,
            "timeout": 10,           # asyncpg: timeout de ligação (segundos)
            "command_timeout": 30,   # asyncpg: timeout de comandos SQL
        }
        engine_kwargs = {
            "pool_pre_ping": True,   # Verifica ligação antes de usar (detecta desconexões)
            "pool_timeout": 15,      # Espera máx. por ligação disponível no pool
            "pool_recycle": 300,     # Recicla ligações a cada 5 min (evita timeout do servidor)
            "pool_size": 5,
            "max_overflow": 2,
        }
        logger.info(f"[SIGMS] Base de dados: PostgreSQL @ {url.split('@')[-1].split('/')[0]}")

    elif url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        # SQLite não usa pool de conexões (single-file, single-writer)
        engine_kwargs = {"pool_size": 1, "max_overflow": 0} if "StaticPool" not in str(url) else {}

    return create_async_engine(url, echo=False, connect_args=connect_args, **engine_kwargs)


engine = _build_engine(_url)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """
    Criar/verificar todas as tabelas.

    Sem fallback silencioso para SQLite — se a BD configurada estiver inacessível,
    lança exceção para que o chamador possa retry ou reportar o erro claramente.
    O fallback silencioso para SQLite efémero causa perda de dados em produção.
    """
    try:
        async with engine.begin() as conn:
            from app.models import __all_models__  # noqa — registar todos os modelos
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"[SIGMS] Tabelas criadas/verificadas ({_url.split('://')[0]})")
    except Exception as e:
        logger.error(
            f"[SIGMS] Falha ao criar tabelas em {_url.split('://')[0]}: {e}\n"
            f"[SIGMS] → Verifique DATABASE_URL e a conectividade com a base de dados."
        )
        raise
