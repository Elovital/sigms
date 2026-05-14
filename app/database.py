from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Configurar engine consoante o driver (asyncpg vs aiosqlite)
_url = settings.DATABASE_URL
_connect_args = {}

if _url.startswith("postgresql"):
    # Render PostgreSQL requer SSL mesmo em conexões internas
    import ssl as _ssl
    _ssl_ctx = _ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = _ssl.CERT_NONE
    # connect_timeout: asyncpg desiste após 10s em vez de bloquear indefinidamente
    _connect_args = {"ssl": _ssl_ctx, "timeout": 10}
    _engine_kwargs = {
        "pool_pre_ping": True,
        "pool_timeout": 15,          # aguarda max 15s por ligação do pool
        "pool_recycle": 300,         # reciclar ligações a cada 5 min
        "pool_size": 5,
        "max_overflow": 2,
    }
else:
    _engine_kwargs = {}

engine = create_async_engine(
    _url,
    echo=False,
    connect_args=_connect_args,
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    async with engine.begin() as conn:
        from app.models import __all_models__  # noqa
        await conn.run_sync(Base.metadata.create_all)
