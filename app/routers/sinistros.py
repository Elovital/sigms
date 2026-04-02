"""Sinistros CRUD endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pathlib import Path
import shutil
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_current_user
from app.models.sinistro import Sinistro, SinistroDoc
from app.models.user import User

router = APIRouter(prefix="/sinistros", tags=["sinistros"])

VALID_TRANSITIONS = {
    "Aberto": ["Em Analise", "Anulado"],
    "Em Analise": ["Em Regularizacao", "Anulado"],
    "Em Regularizacao": ["Fechado", "Anulado"],
    "Fechado": [],
    "Anulado": [],
}

ARCHIVE_DIR = Path("data/archive")


class SinistroIn(BaseModel):
    numero_processo: str
    apolice_id: int
    client_id: int
    data_sinistro: str
    data_participacao: Optional[str] = None
    descricao: str
    estado: str = "Aberto"
    valor_estimado: Optional[float] = None
    perito: Optional[str] = None
    notas: Optional[str] = None


class SinistroUpdate(BaseModel):
    estado: Optional[str] = None
    valor_estimado: Optional[float] = None
    valor_pago: Optional[float] = None
    perito: Optional[str] = None
    notas: Optional[str] = None


def _sinistro_dict(s: Sinistro) -> dict:
    return {
        "id": s.id, "numero_processo": s.numero_processo,
        "apolice_id": s.apolice_id,
        "apolice_numero": s.apolice.numero if s.apolice else None,
        "client_id": s.client_id,
        "client_nome": s.client.nome if s.client else None,
        "client_nif": s.client.nif if s.client else None,
        "data_sinistro": s.data_sinistro, "data_participacao": s.data_participacao,
        "descricao": s.descricao, "estado": s.estado,
        "valor_estimado": s.valor_estimado, "valor_pago": s.valor_pago,
        "perito": s.perito, "notas": s.notas,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("")
async def list_sinistros(
    estado: Optional[str] = Query(None),
    apolice_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if estado:
        filters.append(Sinistro.estado == estado)
    if apolice_id:
        filters.append(Sinistro.apolice_id == apolice_id)
    if client_id:
        filters.append(Sinistro.client_id == client_id)

    count_stmt = select(func.count()).select_from(
        select(Sinistro).where(*filters).subquery()
    )
    total = (await db.execute(count_stmt)).scalar()

    stmt = select(Sinistro).options(
        selectinload(Sinistro.apolice), selectinload(Sinistro.client)
    ).where(*filters).offset((page - 1) * size).limit(size).order_by(Sinistro.data_sinistro.desc())
    result = await db.execute(stmt)
    return {"total": total, "items": [_sinistro_dict(s) for s in result.scalars().all()]}


@router.post("", status_code=201)
async def create_sinistro(body: SinistroIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = await db.execute(select(Sinistro).where(Sinistro.numero_processo == body.numero_processo))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Número de processo já existe")
    sinistro = Sinistro(**body.model_dump(), created_by=current_user.id)
    db.add(sinistro)
    await db.commit()
    await db.refresh(sinistro)
    return _sinistro_dict(sinistro)


@router.get("/{sinistro_id}")
async def get_sinistro(sinistro_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Sinistro).options(
            selectinload(Sinistro.apolice), selectinload(Sinistro.client), selectinload(Sinistro.docs)
        ).where(Sinistro.id == sinistro_id)
    )
    sinistro = result.scalar_one_or_none()
    if not sinistro:
        raise HTTPException(status_code=404, detail="Sinistro não encontrado")
    d = _sinistro_dict(sinistro)
    d["docs"] = [{"id": doc.id, "filename": doc.filename, "tipo": doc.tipo} for doc in sinistro.docs]
    return d


@router.put("/{sinistro_id}")
async def update_sinistro(sinistro_id: int, body: SinistroUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Sinistro).where(Sinistro.id == sinistro_id))
    sinistro = result.scalar_one_or_none()
    if not sinistro:
        raise HTTPException(status_code=404, detail="Sinistro não encontrado")

    if body.estado and body.estado != sinistro.estado:
        allowed = VALID_TRANSITIONS.get(sinistro.estado, [])
        if body.estado not in allowed:
            raise HTTPException(status_code=422, detail=f"Transição inválida: {sinistro.estado} -> {body.estado}")
        sinistro.estado = body.estado

    for field in ["valor_estimado", "valor_pago", "perito", "notas"]:
        val = getattr(body, field)
        if val is not None:
            setattr(sinistro, field, val)

    sinistro.updated_at = datetime.now(timezone.utc)
    await db.commit()
    # Reload with relationships for the response
    result2 = await db.execute(
        select(Sinistro).options(
            selectinload(Sinistro.apolice), selectinload(Sinistro.client)
        ).where(Sinistro.id == sinistro_id)
    )
    return _sinistro_dict(result2.scalar_one())


@router.post("/{sinistro_id}/docs")
async def upload_doc(sinistro_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Sinistro).where(Sinistro.id == sinistro_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Sinistro não encontrado")

    ts = datetime.now().strftime("%Y/%m")
    dest_dir = ARCHIVE_DIR / ts
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"sinistro_{sinistro_id}_{file.filename}"
    dest = dest_dir / safe_name
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = SinistroDoc(sinistro_id=sinistro_id, filename=file.filename, path=str(dest), uploaded_by=current_user.id)
    db.add(doc)
    await db.commit()
    return {"id": doc.id, "filename": doc.filename}
