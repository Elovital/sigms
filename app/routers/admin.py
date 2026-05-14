"""Admin endpoints: user management, audit log, backup."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pathlib import Path

from app.database import get_db
from app.dependencies import require_admin, get_current_user
from app.models.user import User
from app.models.audit import AuditLog
from app.services.auth_service import hash_password
from app.services.backup_service import run_daily_backup, BACKUP_DIR

router = APIRouter(prefix="/admin", tags=["admin"])


class UserIn(BaseModel):
    username: str
    email: str
    password: str
    role: str = "comercial"


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active, "two_factor_enabled": u.two_factor_enabled, "must_change_password": bool(u.must_change_password), "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None} for u in users]


@router.post("/users", status_code=201)
async def create_user(body: UserIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    # Verificar username duplicado
    if (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username já existe")
    # Verificar email duplicado (evita erro 500 por unique constraint na BD)
    if (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email já está em uso por outro utilizador")
    user = User(username=body.username, email=body.email, hashed_password=hash_password(body.password), role=body.role, must_change_password=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)  # garante que user.id e outros campos gerados pela BD estão populados
    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role}


@router.put("/users/{user_id}")
async def update_user(user_id: int, body: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    if body.email:
        user.email = body.email
    if body.role:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = hash_password(body.password)
        user.must_change_password = True
    await db.commit()
    return {"id": user.id, "username": user.username, "role": user.role, "is_active": user.is_active}


@router.get("/audit-log")
async def get_audit_log(
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stmt = select(AuditLog)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(AuditLog.created_at.desc())
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return {
        "total": total, "items": [{"id": l.id, "user_id": l.user_id, "action": l.action, "entity_type": l.entity_type, "entity_id": l.entity_id, "detail": l.detail, "ip_address": l.ip_address, "created_at": l.created_at.isoformat()} for l in logs]
    }


@router.post("/backup")
async def trigger_backup(current_user: User = Depends(require_admin)):
    try:
        dest = run_daily_backup()
        return {"message": "Backup criado com sucesso", "path": dest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backup/list")
async def list_backups(current_user: User = Depends(require_admin)):
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(BACKUP_DIR.glob("sigms_*.db"), reverse=True)
    return [{"filename": f.name, "size_kb": round(f.stat().st_size / 1024, 1)} for f in files[:30]]


@router.post("/validate/nif")
async def validate_nif_endpoint(nif: str, current_user: User = Depends(get_current_user)):
    from app.validators.nif import validate_nif
    valid, tipo = validate_nif(nif)
    return {"valid": valid, "tipo": tipo}


@router.post("/validate/iban")
async def validate_iban_endpoint(iban: str, current_user: User = Depends(get_current_user)):
    from app.validators.iban import validate_iban
    return {"valid": validate_iban(iban)}
