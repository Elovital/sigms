"""Apólices CRUD endpoints."""
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.apolice import Apolice, Seguradora, Ramo
from app.models.financeiro import Premio, Pagamento, Comissao
from app.models.sinistro import Sinistro
from app.models.risco import RiscoAuto, RiscoSaudeVida, RiscoEmpresa
from app.models.user import User
from app.validators.matricula import validate_matricula

router = APIRouter(prefix="/apolices", tags=["apolices"])


class RiscoAutoIn(BaseModel):
    matricula: str
    chassis: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[int] = None
    categoria: Optional[str] = None
    uso: Optional[str] = None


class RiscoSaudeVidaIn(BaseModel):
    tipo: str  # Saude / Vida
    capital_seguro: Optional[float] = None
    data_inicio_cobertura: Optional[str] = None


class RiscoEmpresaIn(BaseModel):
    tipo: str  # Frota / AT / Multirriscos
    descricao: Optional[str] = None
    num_veiculos: Optional[int] = None
    num_trabalhadores: Optional[int] = None
    capital_edificio: Optional[float] = None
    capital_conteudo: Optional[float] = None


class ApoliceIn(BaseModel):
    numero: str
    client_id: int
    seguradora_id: int
    ramo_id: int
    data_inicio: str
    data_fim: str
    data_renovacao: Optional[str] = None
    estado: str = "Ativa"
    observacoes: Optional[str] = None
    # Prémio e comissão (criados automaticamente)
    premio_base: Optional[float] = None
    encargos: Optional[float] = 0.0
    fracionamento: Optional[str] = "Anual"
    percentagem_comissao: Optional[float] = None
    tipo_comissao: Optional[str] = "angariacao"
    risco_auto: Optional[RiscoAutoIn] = None
    risco_saude_vida: Optional[RiscoSaudeVidaIn] = None
    risco_empresa: Optional[RiscoEmpresaIn] = None


def _apolice_dict(a: Apolice) -> dict:
    return {
        "id": a.id, "numero": a.numero, "client_id": a.client_id,
        "client_nome": a.client.nome if a.client else None,
        "client_nif": a.client.nif if a.client else None,
        "seguradora_id": a.seguradora_id, "seguradora": a.seguradora.nome if a.seguradora else None,
        "ramo_id": a.ramo_id, "ramo": a.ramo.nome if a.ramo else None, "ramo_codigo": a.ramo.codigo if a.ramo else None,
        "data_inicio": a.data_inicio, "data_fim": a.data_fim, "data_renovacao": a.data_renovacao,
        "estado": a.estado, "observacoes": a.observacoes,
        "vendedor_id": a.vendedor_id,
        "vendedor_nome": a.vendedor.username if a.vendedor else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("")
async def list_apolices(
    client_id: Optional[int] = Query(None),
    ramo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    seguradora_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Apolice).where(Apolice.deleted_at.is_(None))
    if client_id:
        stmt = stmt.where(Apolice.client_id == client_id)
    if estado:
        stmt = stmt.where(Apolice.estado == estado)
    if seguradora_id:
        stmt = stmt.where(Apolice.seguradora_id == seguradora_id)
    if q:
        stmt = stmt.where(Apolice.numero.ilike(f"%{q}%"))
    if ramo:
        ramo_result = await db.execute(select(Ramo).where(Ramo.codigo == ramo.upper()))
        ramo_obj = ramo_result.scalar_one_or_none()
        if ramo_obj:
            stmt = stmt.where(Apolice.ramo_id == ramo_obj.id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Apolice.created_at.desc())
    result = await db.execute(stmt)
    apolices = result.scalars().all()
    return {"total": total, "page": page, "size": size, "items": [_apolice_dict(a) for a in apolices]}


@router.post("", status_code=201)
async def create_apolice(body: ApoliceIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (body.numero or "").strip():
        raise HTTPException(status_code=422, detail="O número da apólice é obrigatório.")
    if body.risco_auto and not validate_matricula(body.risco_auto.matricula):
        raise HTTPException(status_code=422, detail="Matrícula inválida")
    existing = await db.execute(select(Apolice).where(Apolice.numero == body.numero))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Número de apólice já existe")

    apolice = Apolice(
        numero=body.numero, client_id=body.client_id, seguradora_id=body.seguradora_id,
        ramo_id=body.ramo_id, data_inicio=body.data_inicio, data_fim=body.data_fim,
        data_renovacao=body.data_renovacao or body.data_fim,
        estado=body.estado, observacoes=body.observacoes,
        created_by=current_user.id, vendedor_id=current_user.id,
    )
    db.add(apolice)
    await db.flush()

    if body.risco_auto:
        db.add(RiscoAuto(apolice_id=apolice.id, **body.risco_auto.model_dump()))
    if body.risco_saude_vida:
        db.add(RiscoSaudeVida(apolice_id=apolice.id, **body.risco_saude_vida.model_dump()))
    if body.risco_empresa:
        db.add(RiscoEmpresa(apolice_id=apolice.id, **body.risco_empresa.model_dump()))

    # Auto-create Premio and Comissao if provided
    if body.premio_base and body.premio_base > 0:
        if not (body.data_inicio or "").strip():
            raise HTTPException(status_code=422, detail="Data de início é obrigatória para registar o prémio.")
        from app.services.financeiro_service import calcular_imposto, calcular_parcelas
        from datetime import date as date_type
        encargos = body.encargos or 0.0
        imposto = calcular_imposto(body.premio_base, encargos)
        total = round(body.premio_base + encargos + imposto, 2)
        frac = body.fracionamento or "Anual"
        frac_map = {"Anual": 1, "Semestral": 2, "Trimestral": 4, "Mensal": 12}
        n = frac_map.get(frac, 1)
        parcelas = calcular_parcelas(frac, total)  # última parcela ajustada p/ somar o total exacto
        premio = Premio(
            apolice_id=apolice.id,
            premio_base=body.premio_base,
            encargos=encargos,
            imposto_selo=imposto,
            premio_total=total,
            moeda="AKZ",
            fracionamento=frac,
            periodo_inicio=body.data_inicio,
            periodo_fim=body.data_fim,
        )
        db.add(premio)
        await db.flush()
        inicio = date_type.fromisoformat(body.data_inicio)
        months_step = {1: 12, 2: 6, 4: 3, 12: 1}.get(n, 12)
        for i in range(n):
            m = inicio.month + i * months_step
            y = inicio.year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            venc = inicio.replace(year=y, month=m)
            db.add(Pagamento(premio_id=premio.id, data_vencimento=venc.isoformat(), valor=parcelas[i]))
        if body.percentagem_comissao and body.percentagem_comissao > 0:
            valor_com = round(body.premio_base * body.percentagem_comissao / 100, 2)
            db.add(Comissao(
                apolice_id=apolice.id,
                tipo=body.tipo_comissao or "angariacao",
                percentagem=body.percentagem_comissao,
                valor=valor_com,
                data_referencia=body.data_inicio,
                estado="Prevista",
            ))

    await db.commit()
    await db.refresh(apolice)
    return _apolice_dict(apolice)


@router.get("/renewing-soon")
async def renewing_soon(days: int = Query(30), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    threshold = (date.today() + timedelta(days=days)).isoformat()
    today = date.today().isoformat()
    result = await db.execute(
        select(Apolice).where(
            Apolice.data_renovacao <= threshold,
            Apolice.data_renovacao >= today,
            Apolice.deleted_at.is_(None),
            Apolice.estado == "Ativa",
        ).order_by(Apolice.data_renovacao)
    )
    return [_apolice_dict(a) for a in result.scalars().all()]


@router.get("/{apolice_id}")
async def get_apolice(apolice_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Apolice).where(Apolice.id == apolice_id, Apolice.deleted_at.is_(None)))
    apolice = result.scalar_one_or_none()
    if not apolice:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")
    d = _apolice_dict(apolice)
    if apolice.premios:
        p = apolice.premios[0]
        d["premio_base"] = p.premio_base
        d["encargos"] = p.encargos
        d["fracionamento"] = p.fracionamento
    if apolice.comissoes:
        d["percentagem_comissao"] = apolice.comissoes[0].percentagem
    if apolice.risco_auto:
        ra = apolice.risco_auto
        d["risco_auto"] = {"matricula": ra.matricula, "chassis": ra.chassis, "marca": ra.marca, "modelo": ra.modelo, "ano": ra.ano, "categoria": ra.categoria, "uso": ra.uso}
    if apolice.risco_saude_vida:
        rsv = apolice.risco_saude_vida
        d["risco_saude_vida"] = {"tipo": rsv.tipo, "capital_seguro": rsv.capital_seguro, "data_inicio_cobertura": rsv.data_inicio_cobertura,
                                  "beneficiarios": [{"nome": b.nome, "nif": b.nif, "parentesco": b.parentesco, "percentagem": b.percentagem} for b in rsv.beneficiarios]}
    if apolice.risco_empresa:
        re_ = apolice.risco_empresa
        d["risco_empresa"] = {"tipo": re_.tipo, "descricao": re_.descricao, "num_veiculos": re_.num_veiculos, "num_trabalhadores": re_.num_trabalhadores, "capital_edificio": re_.capital_edificio, "capital_conteudo": re_.capital_conteudo}
    return d


@router.put("/{apolice_id}")
async def update_apolice(apolice_id: int, body: ApoliceIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Apolice).where(Apolice.id == apolice_id, Apolice.deleted_at.is_(None)))
    apolice = result.scalar_one_or_none()
    if not apolice:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")
    if body.risco_auto and not validate_matricula(body.risco_auto.matricula):
        raise HTTPException(status_code=422, detail="Matrícula inválida")
    # Permitir atribuir número a uma apólice que ficou sem número (ex.: importação).
    # Não se altera um número já existente — isso podia partir referências.
    if not (apolice.numero or "").strip() and (body.numero or "").strip():
        novo_numero = body.numero.strip()
        dup = await db.execute(select(Apolice).where(Apolice.numero == novo_numero, Apolice.id != apolice.id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Número de apólice já existe")
        apolice.numero = novo_numero
    for field in ["seguradora_id", "ramo_id", "data_inicio", "data_fim", "data_renovacao", "estado", "observacoes"]:
        setattr(apolice, field, getattr(body, field))
    apolice.alerta_renovacao_enviado = False

    # Sincronizar dados de risco (eram ignorados na edição — não gravavam).
    # Cada apólice tem no máximo um risco de cada tipo (relação 1:1).
    async def _sync_risco(model, existing_obj, payload):
        if payload is None:
            return
        data = payload.model_dump()
        if existing_obj:
            for k, v in data.items():
                setattr(existing_obj, k, v)
        else:
            db.add(model(apolice_id=apolice.id, **data))

    await _sync_risco(RiscoAuto, apolice.risco_auto, body.risco_auto)
    await _sync_risco(RiscoSaudeVida, apolice.risco_saude_vida, body.risco_saude_vida)
    await _sync_risco(RiscoEmpresa, apolice.risco_empresa, body.risco_empresa)

    # Sincronizar prémio e comissão na edição. Antes eram ignorados: ao alterar
    # o prémio, o sistema mantinha o valor antigo (gravava valores errados).
    if body.premio_base and body.premio_base > 0:
        if not (body.data_inicio or "").strip():
            raise HTTPException(status_code=422, detail="Data de início é obrigatória para registar o prémio.")
        from app.services.financeiro_service import calcular_imposto, calcular_parcelas
        from datetime import date as date_type
        encargos = body.encargos or 0.0
        imposto = calcular_imposto(body.premio_base, encargos)
        total = round(body.premio_base + encargos + imposto, 2)
        frac = body.fracionamento or "Anual"
        frac_map = {"Anual": 1, "Semestral": 2, "Trimestral": 4, "Mensal": 12}
        n = frac_map.get(frac, 1)
        parcelas = calcular_parcelas(frac, total)  # última parcela ajustada p/ somar o total exacto

        premio = apolice.premios[0] if apolice.premios else None
        if premio is None:
            premio = Premio(apolice_id=apolice.id, moeda="AKZ")
            db.add(premio)
        premio.premio_base = body.premio_base
        premio.encargos = encargos
        premio.imposto_selo = imposto
        premio.premio_total = total
        premio.fracionamento = frac
        premio.periodo_inicio = body.data_inicio
        premio.periodo_fim = body.data_fim
        await db.flush()

        # Regenerar o plano de pagamentos — só se nenhuma parcela foi paga,
        # para não destruir histórico financeiro já registado.
        pagamentos = (await db.execute(select(Pagamento).where(Pagamento.premio_id == premio.id))).scalars().all()
        if not any(pg.estado == "Pago" for pg in pagamentos):
            for pg in pagamentos:
                await db.delete(pg)
            await db.flush()
            inicio = date_type.fromisoformat(body.data_inicio)
            months_step = {1: 12, 2: 6, 4: 3, 12: 1}.get(n, 12)
            for i in range(n):
                m = inicio.month + i * months_step
                y = inicio.year + (m - 1) // 12
                m = (m - 1) % 12 + 1
                venc = inicio.replace(year=y, month=m)
                db.add(Pagamento(premio_id=premio.id, data_vencimento=venc.isoformat(), valor=parcelas[i]))

        # Comissão (atualiza a existente ou cria)
        if body.percentagem_comissao and body.percentagem_comissao > 0:
            valor_com = round(body.premio_base * body.percentagem_comissao / 100, 2)
            comissao = apolice.comissoes[0] if apolice.comissoes else None
            if comissao is None:
                comissao = Comissao(apolice_id=apolice.id, tipo=body.tipo_comissao or "angariacao",
                                    data_referencia=body.data_inicio, estado="Prevista")
                db.add(comissao)
            comissao.percentagem = body.percentagem_comissao
            comissao.valor = valor_com

    await db.commit()
    await db.refresh(apolice)
    return _apolice_dict(apolice)


@router.delete("/{apolice_id}", status_code=204)
async def delete_apolice(
    apolice_id: int,
    motivo: str = Query(..., min_length=10, description="Motivo obrigatório para eliminação"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from datetime import datetime, timezone
    from app.models.audit import AuditLog
    result = await db.execute(select(Apolice).where(Apolice.id == apolice_id))
    apolice = result.scalar_one_or_none()
    if not apolice:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")
    numero_original = apolice.numero
    now = datetime.now(timezone.utc)
    # Rename numero to free the unique slot so the same number can be re-registered
    apolice.numero = f"{numero_original}__DEL__{apolice_id}"
    apolice.deleted_at = now
    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity_type="apolice",
        entity_id=apolice_id,
        detail=f"Apólice {numero_original} eliminada. Motivo: {motivo}",
    ))
    await db.commit()


class VendedorUpdate(BaseModel):
    vendedor_id: int


@router.patch("/{apolice_id}/vendedor")
async def update_vendedor(apolice_id: int, body: VendedorUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    from app.models.audit import AuditLog
    result = await db.execute(select(Apolice).where(Apolice.id == apolice_id, Apolice.deleted_at.is_(None)))
    apolice = result.scalar_one_or_none()
    if not apolice:
        raise HTTPException(status_code=404, detail="Apólice não encontrada")
    user_result = await db.execute(select(User).where(User.id == body.vendedor_id))
    new_vendedor = user_result.scalar_one_or_none()
    if not new_vendedor:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    old_nome = apolice.vendedor.username if apolice.vendedor else "N/A"
    apolice.vendedor_id = body.vendedor_id
    db.add(AuditLog(user_id=current_user.id, action="update", entity_type="apolice", entity_id=apolice_id,
        detail=f"Vendedor alterado de '{old_nome}' para '{new_vendedor.username}'"))
    await db.commit()
    await db.refresh(apolice)
    return {"vendedor_id": apolice.vendedor_id, "vendedor_nome": new_vendedor.username}


@router.get("/{apolice_id}/loss-ratio")
async def get_loss_ratio(apolice_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    sin_result = await db.execute(select(func.sum(Sinistro.valor_pago)).where(Sinistro.apolice_id == apolice_id))
    total_sinistros = sin_result.scalar() or 0.0
    prem_result = await db.execute(select(func.sum(Premio.premio_total)).where(Premio.apolice_id == apolice_id))
    total_premio = prem_result.scalar() or 0.0
    loss_ratio = round((total_sinistros / total_premio * 100), 2) if total_premio > 0 else 0.0
    return {"apolice_id": apolice_id, "total_sinistros": total_sinistros, "total_premio": total_premio, "loss_ratio": loss_ratio}


@router.get("/lookup/seguradoras")
async def list_seguradoras(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Seguradora).where(Seguradora.ativo == True).order_by(Seguradora.nome))
    return [{"id": s.id, "nome": s.nome} for s in result.scalars().all()]


@router.get("/lookup/ramos")
async def list_ramos(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Ramo))
    return [{"id": r.id, "codigo": r.codigo, "nome": r.nome} for r in result.scalars().all()]
