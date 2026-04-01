"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.services import auth_service
from app.services.encryption_service import encrypt, decrypt

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TwoFARequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False
    pre_auth_token: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user_by_username(db, body.username)
    if not user or not auth_service.verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    if user.two_factor_enabled:
        pre_auth = auth_service.create_pre_auth_token(user.id)
        return TokenResponse(requires_2fa=True, pre_auth_token=pre_auth, access_token="")

    access_token = auth_service.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = auth_service.create_refresh_token_value()
    await auth_service.store_refresh_token(db, user.id, refresh_token)
    response.set_cookie("refresh_token", refresh_token, httponly=True, max_age=7 * 86400, samesite="strict")
    return TokenResponse(access_token=access_token)


@router.post("/2fa/verify-login")
async def verify_2fa_login(body: TwoFARequest, response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    pre_auth = request.headers.get("X-Pre-Auth-Token")
    if not pre_auth:
        raise HTTPException(status_code=400, detail="Pre-auth token necessário")
    try:
        payload = auth_service.decode_token(pre_auth)
        if payload.get("type") != "pre_auth":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token expirado")

    user = await auth_service.get_user_by_id(db, user_id)
    if not user or not user.totp_secret_enc:
        raise HTTPException(status_code=400, detail="2FA não configurado")

    secret = decrypt(user.totp_secret_enc)
    if not auth_service.verify_totp(secret, body.code):
        raise HTTPException(status_code=401, detail="Código 2FA inválido")

    access_token = auth_service.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = auth_service.create_refresh_token_value()
    await auth_service.store_refresh_token(db, user.id, refresh_token)
    response.set_cookie("refresh_token", refresh_token, httponly=True, max_age=7 * 86400, samesite="strict")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token não encontrado")
    rt = await auth_service.validate_refresh_token(db, token)
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token inválido ou expirado")
    user = await auth_service.get_user_by_id(db, rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilizador inativo")

    await auth_service.revoke_refresh_token(db, token)
    new_refresh = auth_service.create_refresh_token_value()
    await auth_service.store_refresh_token(db, user.id, new_refresh)
    response.set_cookie("refresh_token", new_refresh, httponly=True, max_age=7 * 86400, samesite="strict")
    access_token = auth_service.create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        await auth_service.revoke_refresh_token(db, token)
    response.delete_cookie("refresh_token")
    return {"message": "Sessão terminada"}


@router.post("/2fa/setup")
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    secret = auth_service.generate_totp_secret()
    uri = auth_service.get_totp_uri(secret, current_user.username)
    qr = auth_service.generate_qr_code_base64(uri)
    # Store encrypted temporarily (enabled after verify)
    current_user.totp_secret_enc = encrypt(secret)
    await db.commit()
    return {"qr_code": f"data:image/png;base64,{qr}", "secret": secret}


@router.post("/2fa/enable")
async def enable_2fa(body: TwoFARequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user.totp_secret_enc:
        raise HTTPException(status_code=400, detail="Execute /auth/2fa/setup primeiro")
    secret = decrypt(current_user.totp_secret_enc)
    if not auth_service.verify_totp(secret, body.code):
        raise HTTPException(status_code=400, detail="Código inválido")
    current_user.two_factor_enabled = True
    await db.commit()
    return {"message": "2FA ativado com sucesso"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "two_factor_enabled": current_user.two_factor_enabled,
    }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not auth_service.verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha actual incorrecta")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres")
    current_user.hashed_password = auth_service.hash_password(body.new_password)
    await db.commit()
    return {"message": "Senha alterada com sucesso"}
