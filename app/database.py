import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)

_SQLITE_FALLBACK = "sqlite+aiosqlite:////app/data/sigms.db"

# Erros que indicam que a BD PostgreSQL não existe / expirou
_FATAL_PG_ERRORS = (
    "Name or service not known",
    "could not translate host name",
    "nodename nor servname provided",
    "Connection refused",
    "host not found",
)


def _build_engine(url: str):
    """Criar engine SQLAlchemy com parâmetros adequados ao driver."""
    connect_args: dict = {}
    engine_kwargs: dict = {}

    if url.startswith("postgresql"):
        import ssl as _ssl
        ssl_ctx = _ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = _ssl.CERT_NONE
        connect_args = {"ssl": ssl_ctx, "timeout": 10}   # asyncpg: 10s por tentativa
        engine_kwargs = {
            "pool_pre_ping": True,
            "pool_timeout": 15,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 2,
        }

    return create_async_engine(url, echo=False, connect_args=connect_args, **engine_kwargs)


_url = settings.DATABASE_URL
engine = _build_engine(_url)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """Criar tabelas. Se PostgreSQL estiver inacessível, faz fallback para SQLite."""
    global engine, AsyncSessionLocal

    try:
        async with engine.begin() as conn:
            from app.models import __all_models__  # noqa
            await conn.run_sync(Base.metadata.create_all)

    except Exception as e:
        err_str = str(e)
        is_pg = _url.startswith("postgresql")
        is_fatal = any(msg in err_str for msg in _FATAL_PG_ERRORS)

        if is_pg and is_fatal:
            logger.error(
                f"[SIGMS] PostgreSQL inacessível ({err_str[:120]}). "
                f"A mudar automaticamente para SQLite local..."
            )
            engine = _build_engine(_SQLITE_FALLBACK)
            AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            async with engine.begin() as conn:
                from app.models import __all_models__  # noqa
                await conn.run_sync(Base.metadata.create_all)
            logger.info("[SIGMS] Fallback SQLite: tabelas criadas com sucesso")
        else:
            raise
