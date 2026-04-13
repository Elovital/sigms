from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Configurar engine consoante o driver (asyncpg vs aiosqlite)
_url = settings.DATABASE_URL
_connect_args = {}

if _url.startswith("postgresql"):
    # asyncpg: desactivar SSL em conexões internas Render (mesmo VPC)
    _connect_args = {"ssl": False}
    _engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
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
