"""Client (CRM) CRUD + LPDP Angola endpoints."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_admin, get_client_ip
from app.models.client import Client, Contact, RgpdConsentLog
from app.models.audit import AuditLog
from app.models.user import User
from app.validators.nif import validate_nif
from app.validators.iban import validate_iban, ANGOLA_PROVINCES
from app.validators.postal_code import validate_provincia

router = APIRouter(prefix="/clients", tags=["clients"])


class ContactIn(BaseModel):
    tipo: str
    valor: str
    principal: bool = False


class ClientIn(BaseModel):
    tipo: str
    nome: str
    nif: str
    data_nascimento: Optional[str] = None
    data_constituicao: Optional[str] = None
    iban: Optional[str] = None
    morada_linha1: Optional[str] = None
    morada_linha2: Optional[str] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    lpdp_aceite: bool = False
    contacts: list[ContactIn] = []


async def _log_audit(db: AsyncSession, user_id, action: str, entity_id: int, detail: str = "", ip: str = ""):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="client", entity_id=entity_id, detail=detail, ip_address=ip))


async def _log_lpdp(db: AsyncSession, client_id: int, action: str, user_id, ip: str = "", notes: str = ""):
    db.add(RgpdConsentLog(client_id=client_id, action=action, user_id=user_id, ip_address=ip, notes=notes))


def _client_dict(c: Client) -> dict:
    return {
        "id": c.id, "tipo": c.tipo, "nome": c.nome, "nif": c.nif,
        "data_nascimento": c.data_nascimento, "data_constituicao": c.data_constituicao,
        "iban": c.iban, "morada_linha1": c.morada_linha1, "morada_linha2": c.morada_linha2,
        "provincia": c.provincia, "municipio": c.municipio,
        "rgpd_aceite": c.rgpd_aceite, "created_at": c.created_at.isoformat() if c.created_at else None,
        "anonymized_at": c.anonymized_at.isoformat() if c.anonymized_at else None,
        "contacts": [{"id": ct.id, "tipo": ct.tipo, "valor": ct.valor, "principal": ct.principal} for ct in c.contacts],
    }


@router.get("")
async def list_clients(
    q: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.deleted_at.is_(None))
    if q:
        stmt = stmt.where(or_(Client.nome.ilike(f"%{q}%"), Client.nif.ilike(f"%{q}%")))
    if provincia:
        stmt = stmt.where(Client.provincia == provincia)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Client.nome)
    result = await db.execute(stmt)
    clients = result.scalars().all()
    return {"total": total, "page": page, "size": size, "items": [_client_dict(c) for c in clients]}


@router.get("/provinces")
async def get_provinces(current_user: User = Depends(get_current_user)):
    return ANGOLA_PROVINCES


@router.post("", status_code=201)
async def create_client(body: ClientIn, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    valid, tipo = validate_nif(body.nif)
    if not valid:
        raise HTTPException(status_code=422, detail="NIF inválido")
    if body.iban and not validate_iban(body.iban):
        raise HTTPException(status_code=422, detail="IBAN Angola inválido (formato: AO + 23 dígitos)")

    existing = await db.execute(select(Client).where(Client.nif == body.nif))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="NIF já registado")

    client = Client(
        tipo=body.tipo or tipo, nome=body.nome, nif=body.nif,
        data_nascimento=body.data_nascimento, data_constituicao=body.data_constituicao,
        iban=body.iban, morada_linha1=body.morada_linha1, morada_linha2=body.morada_linha2,
        provincia=body.provincia, municipio=body.municipio,
        rgpd_aceite=body.lpdp_aceite,
    )
    db.add(client)
    await db.flush()
    for ct in body.contacts:
        db.add(Contact(client_id=client.id, tipo=ct.tipo, valor=ct.valor, principal=ct.principal))
    if body.lpdp_aceite:
        await _log_lpdp(db, client.id, "ACEITE", current_user.id, get_client_ip(request))
    await _log_audit(db, current_user.id, "CREATE", client.id, ip=get_client_ip(request))
    await db.commit()
    await db.refresh(client)
    return _client_dict(client)


@router.get("/{client_id}")
async def get_client(client_id: int, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.deleted_at.is_(None)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    await _log_audit(db, current_user.id, "READ", client.id, ip=get_client_ip(request))
    await db.commit()
    return _client_dict(client)


@router.put("/{client_id}")
async def update_client(client_id: int, body: ClientIn, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.deleted_at.is_(None)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if body.iban and not validate_iban(body.iban):
        raise HTTPException(status_code=422, detail="IBAN Angola inválido")

    for field in ["nome", "data_nascimento", "data_constituicao", "iban", "morada_linha1", "morada_linha2", "provincia", "municipio"]:
        setattr(client, field, getattr(body, field))
    if body.lpdp_aceite and not client.rgpd_aceite:
        client.rgpd_aceite = True
        await _log_lpdp(db, client.id, "ACEITE", current_user.id, get_client_ip(request))
    elif not body.lpdp_aceite and client.rgpd_aceite:
        client.rgpd_aceite = False
        await _log_lpdp(db, client.id, "RETIRADO", current_user.id, get_client_ip(request))

    await _log_audit(db, current_user.id, "UPDATE", client.id, ip=get_client_ip(request))
    await db.commit()
    await db.refresh(client)
    return _client_dict(client)


@router.delete("/{client_id}", status_code=204)
async def delete_client(client_id: int, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.deleted_at = datetime.now(timezone.utc)
    await _log_audit(db, current_user.id, "DELETE", client.id, ip=get_client_ip(request))
    await db.commit()


@router.post("/{client_id}/lpdp/anonymize")
async def anonymize_client(client_id: int, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    import hashlib
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if client.anonymized_at:
        raise HTTPException(status_code=409, detail="Cliente já anonimizado")

    nif_hash = hashlib.sha256(client.nif.encode()).hexdigest()[:9]
    client.nome = "ANONIMIZADO"
    client.nif = f"ANN{nif_hash[:6]}"
    client.iban = None
    client.data_nascimento = None
    client.data_constituicao = None
    client.morada_linha1 = None
    client.morada_linha2 = None
    client.provincia = None
    client.municipio = None
    client.anonymized_at = datetime.now(timezone.utc)

    contacts_result = await db.execute(select(Contact).where(Contact.client_id == client_id))
    for ct in contacts_result.scalars().all():
        await db.delete(ct)

    await _log_lpdp(db, client_id, "ANONIMIZACAO", current_user.id, get_client_ip(request))
    await _log_audit(db, current_user.id, "ANONYMIZE", client_id, ip=get_client_ip(request))
    await db.commit()
    return {"message": "Cliente anonimizado com sucesso (Lei n.º 22/11 – LPDP Angola)"}


@router.get("/{client_id}/lpdp/log")
async def get_lpdp_log(client_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(RgpdConsentLog).where(RgpdConsentLog.client_id == client_id).order_by(RgpdConsentLog.created_at.desc()))
    logs = result.scalars().all()
    return [{"id": l.id, "action": l.action, "channel": l.channel, "created_at": l.created_at.isoformat()} for l in logs]
