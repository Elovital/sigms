"""Acompanhamento de Vendas e CRM — dicas, interações, follow-up."""
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.acompanhamento import Interacao
from app.models.user import User

router = APIRouter(prefix="/acompanhamento", tags=["acompanhamento"])


class InteracaoIn(BaseModel):
    client_id: int
    tipo: str
    data_interacao: str
    hora: Optional[str] = None
    assunto: str
    notas: Optional[str] = None
    resultado: Optional[str] = None
    proximo_contacto: Optional[str] = None
    lembrete_ativo: bool = True


# ─── Dicas de Vendas (conteúdo estático contextual) ──────────────────────────

DICAS = {
    "geral": [
        {"titulo": "Primeira impressão conta", "dica": "Nos primeiros 30 segundos, apresenta a ELOVITAL de forma clara: 'Somos mediadores certificados em Angola, com as melhores seguradoras do mercado.' Usa o nome do cliente sempre."},
        {"titulo": "Escuta ativa", "dica": "Faz 2 perguntas antes de apresentar qualquer produto: 'O que é mais importante para si num seguro?' e 'Já teve alguma experiência negativa com seguros?'. As respostas guiam toda a proposta."},
        {"titulo": "Urgência genuína", "dica": "Não inventes urgência falsa. Usa factos reais: 'O seu seguro atual vence em X dias' ou 'Esta tarifa sobe no próximo trimestre'."},
        {"titulo": "Referências e testemunhos", "dica": "Pede sempre 2 referências no fecho: 'Conhece alguém que também beneficiaria deste produto?' Clientes satisfeitos são o melhor canal."},
        {"titulo": "Follow-up a 48h", "dica": "Após qualquer reunião ou proposta, faz sempre um contacto a 48 horas. Estudos mostram que 80% das vendas ocorrem entre o 5.º e o 12.º contacto."},
        {"titulo": "Proposta em PDF", "dica": "Envia sempre a proposta em PDF com o logo ELOVITAL, resumo de coberturas e valor mensal/anual em Kz. Facilita a decisão e transmite profissionalismo."},
    ],
    "AUTO": [
        {"titulo": "Comparação de coberturas", "dica": "Apresenta sempre 3 opções (Básico/Médio/Completo). O cliente escolhe o meio — é o efeito de ancoragem. Começa sempre pelo plano completo."},
        {"titulo": "Custo por km", "dica": "Converte o prémio em custo diário: 'Por apenas Kz 800/dia, o seu carro está 100% protegido.' Torna o valor mais tangível."},
        {"titulo": "Matrícula = oportunidade", "dica": "Cada nova matrícula em Angola é uma oportunidade. Ativa alertas de novas matrículas no teu município. Aborda os concessionários locais."},
        {"titulo": "Frota empresarial", "dica": "Empresas com 3+ viaturas têm desconto de frota. Identifica clientes empresariais e propõe revisão de toda a frota anualmente."},
    ],
    "VIDA": [
        {"titulo": "Falar de proteção, não de morte", "dica": "Evita falar em morte. Usa: 'Este produto garante a estabilidade financeira da sua família em qualquer circunstância.'"},
        {"titulo": "Capital adequado", "dica": "Regra prática: capital de vida = 5 a 10x o rendimento anual do cliente. Usa este cálculo para fundamentar o valor proposto."},
        {"titulo": "Beneficiários como âncora emocional", "dica": "Perguntar 'Quem gostaria de proteger?' cria envolvimento emocional. Os beneficiários são a razão de compra, não o produto."},
        {"titulo": "Revisão anual obrigatória", "dica": "Compromete-te a uma revisão anual do capital seguro. Rendimentos e responsabilidades mudam — o seguro deve acompanhar."},
    ],
    "SAUDE": [
        {"titulo": "Custo de hospitalização em Angola", "dica": "Usa dados reais: uma hospitalização privada em Luanda pode custar 500.000 a 2.000.000 Kz. Compara com o prémio anual para mostrar o valor."},
        {"titulo": "Rede de clínicas", "dica": "Conhece a rede de prestadores de cada seguradora. O cliente perguntará 'Que clínicas cobre?' — tens de responder sem hesitar."},
        {"titulo": "Familiar vs. Individual", "dica": "Apresenta sempre o plano familiar se o cliente tiver dependentes. O desconto por agregado familiar pode chegar a 20%."},
    ],
    "AT": [
        {"titulo": "Obrigação legal", "dica": "O seguro de Acidentes de Trabalho é OBRIGATÓRIO em Angola por lei (Lei n.º 7/15). Usa este argumento com empresários que hesitam."},
        {"titulo": "Lista de trabalhadores", "dica": "Pede sempre a lista atualizada de trabalhadores. Trabalhadores não declarados = exclusão de cobertura. Faz esta verificação anualmente."},
        {"titulo": "Visita às instalações", "dica": "Propõe uma visita às instalações do cliente. Demonstra profissionalismo, identifica riscos não declarados e fortalece a relação."},
    ],
    "MULTI": [
        {"titulo": "Inventário de bens", "dica": "Ajuda o cliente a fazer um inventário básico dos bens a segurar. Muitos subestimam o valor do recheio — esta análise evita subseguro."},
        {"titulo": "Bundle habitação + auto", "dica": "Propõe sempre o pacote habitação + auto na mesma seguradora. O desconto multi-produto pode chegar a 15% e facilita a gestão."},
    ],
    "suporte": [
        {"titulo": "Resposta em 2 horas", "dica": "Define um SLA interno: qualquer questão de cliente respondida em máximo 2 horas úteis. A velocidade de resposta é o principal diferenciador no mercado angolano."},
        {"titulo": "Gestão de sinistros proativa", "dica": "Quando um cliente tem sinistro, liga antes de ele ligar a ti. Acompanha o processo e informa semanalmente. Este momento difícil pode criar o cliente mais fiel."},
        {"titulo": "WhatsApp Business", "dica": "Usa WhatsApp Business com respostas automáticas, catálogo de produtos e etiquetas por estado (Lead/Proposta/Cliente Ativo/Em Renovação). É o canal preferido em Angola."},
        {"titulo": "Relatório mensal ao cliente", "dica": "Envia um relatório mensal simples (1 página) ao cliente empresarial: apólices ativas, sinistros, comissões. Diferencia-te da concorrência."},
    ],
    "melhoria": [
        {"titulo": "Pipeline semanal", "dica": "Revê o pipeline todas as segundas-feiras: Quem está em proposta há +7 dias? Quem tem renovação em 30 dias? Quem não foi contactado há +30 dias?"},
        {"titulo": "Métrica: Taxa de conversão", "dica": "Calcula a tua taxa de conversão: propostas enviadas / apólices emitidas. Uma taxa <30% indica problema na qualificação dos leads. >50% indica excelência."},
        {"titulo": "Formação contínua", "dica": "Dedica 30 minutos por semana a estudar um produto ou regulamentação. O mercado de seguros em Angola está em crescimento acelerado — o conhecimento é vantagem competitiva."},
        {"titulo": "Análise da carteira trimestral", "dica": "Faz uma análise trimestral: quais ramos cresceram? Qual é o loss ratio por cliente? Quais clientes têm apenas 1 apólice (oportunidade de cross-sell)?"},
    ],
}


@router.get("/dicas")
async def get_dicas(
    categoria: str = Query("geral"),
    current_user: User = Depends(get_current_user),
):
    """Retorna dicas por categoria: geral, AUTO, VIDA, SAUDE, AT, MULTI, suporte, melhoria."""
    return DICAS.get(categoria.upper(), DICAS.get(categoria, DICAS["geral"]))


@router.get("/dicas/todas")
async def get_todas_dicas(current_user: User = Depends(get_current_user)):
    """Retorna todas as dicas organizadas por categoria."""
    return {cat: dicas for cat, dicas in DICAS.items()}


@router.get("/lembretes")
async def get_lembretes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Todos os lembretes activos com data agendada (vencidos aparecem primeiro)."""
    result = await db.execute(
        select(Interacao).where(
            Interacao.lembrete_ativo == True,
            Interacao.proximo_contacto.isnot(None),
            Interacao.proximo_contacto != "",
        ).order_by(Interacao.proximo_contacto)
    )
    items = result.scalars().all()
    client_ids = list({i.client_id for i in items})
    client_map = {}
    if client_ids:
        from app.models.client import Client
        cr = await db.execute(select(Client).where(Client.id.in_(client_ids)))
        for c in cr.scalars().all():
            client_map[c.id] = c.nome
    return [_interacao_dict(i, client_map) for i in items]


@router.get("/pendentes")
async def get_pendentes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acompanhamentos pendentes para o alerta do dashboard: todos os lembretes
    activos com data de próximo contacto agendada (vencidos aparecem primeiro)."""
    result = await db.execute(
        select(Interacao).where(
            Interacao.lembrete_ativo == True,
            Interacao.proximo_contacto.isnot(None),
            Interacao.proximo_contacto != "",
        ).order_by(Interacao.proximo_contacto)
    )
    items = result.scalars().all()
    client_ids = list({i.client_id for i in items})
    client_map = {}
    if client_ids:
        from app.models.client import Client
        cr = await db.execute(select(Client).where(Client.id.in_(client_ids)))
        for c in cr.scalars().all():
            client_map[c.id] = c.nome
    hoje = date.today().isoformat()
    itens = []
    for i in items:
        d = _interacao_dict(i, client_map)
        d["vencido"] = i.proximo_contacto < hoje
        itens.append(d)
    return {"total": len(itens), "itens": itens}


@router.get("/interacoes")
async def list_interacoes(
    client_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    resultado: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.client import Client
    stmt = select(Interacao).join(Client, Interacao.client_id == Client.id, isouter=True)
    if client_id:
        stmt = stmt.where(Interacao.client_id == client_id)
    if tipo:
        stmt = stmt.where(Interacao.tipo == tipo)
    if resultado:
        stmt = stmt.where(Interacao.resultado == resultado)
    if search:
        stmt = stmt.where(Client.nome.ilike(f"%{search}%"))
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()
    stmt = stmt.offset((page - 1) * size).limit(size).order_by(Interacao.data_interacao.desc())
    result = await db.execute(stmt)
    items = result.scalars().all()
    # Fetch client names
    client_ids = list({i.client_id for i in items})
    client_map = {}
    if client_ids:
        from app.models.client import Client
        cr = await db.execute(select(Client).where(Client.id.in_(client_ids)))
        for c in cr.scalars().all():
            client_map[c.id] = c.nome
    return {"total": total, "items": [_interacao_dict(i, client_map) for i in items]}


@router.post("/interacoes", status_code=201)
async def create_interacao(
    body: InteracaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interacao = Interacao(**body.model_dump(), created_by=current_user.id)
    db.add(interacao)
    await db.commit()
    await db.refresh(interacao)
    return _interacao_dict(interacao)


@router.get("/interacoes/{interacao_id}")
async def get_interacao(
    interacao_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Interacao).where(Interacao.id == interacao_id))
    interacao = result.scalar_one_or_none()
    if not interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    return _interacao_dict(interacao)


@router.put("/interacoes/{interacao_id}")
async def update_interacao(
    interacao_id: int,
    body: InteracaoIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Interacao).where(Interacao.id == interacao_id))
    interacao = result.scalar_one_or_none()
    if not interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    for field, value in body.model_dump().items():
        setattr(interacao, field, value)
    await db.commit()
    return _interacao_dict(interacao)


@router.delete("/interacoes/{interacao_id}", status_code=204)
async def delete_interacao(
    interacao_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Interacao).where(Interacao.id == interacao_id))
    interacao = result.scalar_one_or_none()
    if not interacao:
        raise HTTPException(status_code=404, detail="Interação não encontrada")
    await db.delete(interacao)
    await db.commit()


@router.get("/stats/{client_id}")
async def client_stats(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumo de interações por tipo e resultado para um cliente."""
    result = await db.execute(
        select(Interacao.tipo, func.count().label("total"))
        .where(Interacao.client_id == client_id)
        .group_by(Interacao.tipo)
    )
    por_tipo = {r.tipo: r.total for r in result.all()}

    result2 = await db.execute(
        select(Interacao.resultado, func.count().label("total"))
        .where(Interacao.client_id == client_id, Interacao.resultado.isnot(None))
        .group_by(Interacao.resultado)
    )
    por_resultado = {r.resultado: r.total for r in result2.all()}

    total_interacoes = sum(por_tipo.values())
    return {"total_interacoes": total_interacoes, "por_tipo": por_tipo, "por_resultado": por_resultado}


def _interacao_dict(i: Interacao, client_map: dict = None) -> dict:
    return {
        "id": i.id, "client_id": i.client_id,
        "client_nome": (client_map or {}).get(i.client_id),
        "tipo": i.tipo,
        "data_interacao": i.data_interacao, "hora": i.hora,
        "assunto": i.assunto, "notas": i.notas, "resultado": i.resultado,
        "proximo_contacto": i.proximo_contacto, "lembrete_ativo": i.lembrete_ativo,
        "created_by": i.created_by, "created_at": i.created_at.isoformat() if i.created_at else None,
    }
