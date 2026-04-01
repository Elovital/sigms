"""SIGMS ELOVITAL - Sistema Integrado de Gestão de Mediação de Seguros"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import settings
from app.database import create_tables
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("data").mkdir(exist_ok=True)
    Path("data/backups").mkdir(exist_ok=True)
    Path("data/archive").mkdir(exist_ok=True)
    await create_tables()
    await seed_defaults()
    start_scheduler()
    yield
    stop_scheduler()


async def seed_defaults():
    from app.database import AsyncSessionLocal
    from app.models.apolice import Seguradora, Ramo
    from app.models.user import User
    from app.services.auth_service import hash_password
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # Seguradoras Angola — lista ARSEG (arseg.ao) — ordenadas alfabeticamente
        seguradoras = [
            "AAA Seguros - Angolan American Alliance, S.A.",
            "Africaseguros, S.A.",
            "Aliança Seguros, S.A.",
            "BIC Seguros, S.A.",
            "Confiança Seguros, S.A.",
            "ENSA - Empresa Nacional de Seguros de Angola, S.A.",
            "Fidelidade Angola, S.A.",
            "Fortaleza Seguros, S.A.",
            "Garantia - Companhia de Seguros, S.A.",
            "Harmonia Seguros, S.A.",
            "Liberty & Trevo Seguros, S.A.",
            "Liberty Angola Seguros, S.A.",
            "NovaSeguros, S.A.",
            "Nossa Seguros, S.A.",
            "Prefira Seguros, S.A.",
            "Real Seguros, S.A.",
            "Sanlam Angola, S.A.",
            "Segurança - Companhia de Seguros, S.A.",
            "SIA - Seguradora Internacional de Angola, S.A.",
            "Sol Seguros, S.A.",
            "STAS Seguros, S.A.",
            "Tranquilidade Angola, S.A.",
            "Unisaúde Seguros, S.A.",
            "Viva Seguros, S.A.",
            "Weza Seguros, S.A.",
        ]
        for nome in seguradoras:
            existing = await db.execute(select(Seguradora).where(Seguradora.nome == nome))
            if not existing.scalar_one_or_none():
                db.add(Seguradora(nome=nome))

        # Ramos
        ramos = [
            ("AUTO", "Automóvel"),
            ("VIDA", "Vida"),
            ("SAUDE", "Saúde"),
            ("AT", "Acidentes de Trabalho"),
            ("MULTI", "Multirriscos"),
            ("RC", "Responsabilidade Civil"),
            ("VIAGEM", "Viagem"),
        ]
        for codigo, nome in ramos:
            existing = await db.execute(select(Ramo).where(Ramo.codigo == codigo))
            if not existing.scalar_one_or_none():
                db.add(Ramo(codigo=codigo, nome=nome))

        # Admin padrão
        existing_admin = await db.execute(select(User).where(User.username == "admin"))
        if not existing_admin.scalar_one_or_none():
            db.add(User(
                username="admin",
                email="admin@elovital.ao",
                hashed_password=hash_password("Admin@2026!"),
                role="admin",
            ))

        await db.commit()


app = FastAPI(
    title="SIGMS ELOVITAL",
    version="1.0.0",
    description="Sistema Integrado de Gestão de Mediação de Seguros — ELOVITAL Angola",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, clients, apolices, financeiro, sinistros, dashboard, admin, imports
from app.routers import acompanhamento
from app.routers import prospeccao

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(apolices.router)
app.include_router(financeiro.router)
app.include_router(sinistros.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(imports.router)
app.include_router(acompanhamento.router)
app.include_router(prospeccao.router)

static_dir = Path("static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
async def root():
    index = Path("static/index.html")
    if index.exists():
        return FileResponse(index)
    return {"message": "SIGMS ELOVITAL v1.0 — API running"}


@app.get("/health")
async def health():
    return {"status": "ok", "app": "SIGMS ELOVITAL", "version": "1.0.0"}
