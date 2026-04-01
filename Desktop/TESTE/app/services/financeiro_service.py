"""Financial business logic: taxas Angola, fracionamento, comissões."""

MOEDA = "AKZ"
SIMBOLO = "Kz"

# Taxa de imposto sobre prémios de seguros Angola (indicativa)
TAXA_IMPOSTO = 0.04  # 4% ISS Angola (ajustável por ramo)

FRACIONAMENTO_PARCELAS = {
    "Anual": 1,
    "Semestral": 2,
    "Trimestral": 4,
    "Mensal": 12,
}

COMISSAO_PADRAO = {
    "AUTO":   {"angariacao": 15.0, "renovacao": 12.0, "gestao": 5.0},
    "VIDA":   {"angariacao": 20.0, "renovacao": 15.0, "gestao": 5.0},
    "SAUDE":  {"angariacao": 18.0, "renovacao": 14.0, "gestao": 5.0},
    "AT":     {"angariacao": 12.0, "renovacao": 10.0, "gestao": 5.0},
    "MULTI":  {"angariacao": 15.0, "renovacao": 12.0, "gestao": 5.0},
    "RC":     {"angariacao": 13.0, "renovacao": 10.0, "gestao": 5.0},
    "VIAGEM": {"angariacao": 20.0, "renovacao": 18.0, "gestao": 3.0},
}


def calcular_imposto(premio_base: float, encargos: float, taxa: float = TAXA_IMPOSTO) -> float:
    return round((premio_base + encargos) * taxa, 2)


def calcular_premio_total(premio_base: float, encargos: float, imposto: float) -> float:
    return round(premio_base + encargos + imposto, 2)


def calcular_parcelas(fracionamento: str, premio_total: float) -> list[float]:
    n = FRACIONAMENTO_PARCELAS.get(fracionamento, 1)
    parcela = round(premio_total / n, 2)
    parcelas = [parcela] * n
    diff = round(premio_total - sum(parcelas), 2)
    if diff != 0:
        parcelas[-1] = round(parcelas[-1] + diff, 2)
    return parcelas


def get_comissao_percentagem(ramo_codigo: str, tipo: str) -> float:
    ramo = ramo_codigo.upper()
    defaults = COMISSAO_PADRAO.get(ramo, {"angariacao": 10.0, "renovacao": 8.0, "gestao": 5.0})
    return defaults.get(tipo, 10.0)


def calcular_comissao(valor_base: float, percentagem: float) -> float:
    return round(valor_base * percentagem / 100, 2)
