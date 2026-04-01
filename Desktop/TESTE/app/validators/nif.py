"""
NIF (Número de Identificação Fiscal) validation for Angola.
Angola NIFs are numeric strings of 9 to 14 digits.
"""


def validate_nif(nif: str) -> tuple[bool, str]:
    """Validate an Angola NIF. Returns (is_valid, tipo_contribuinte)."""
    nif = nif.strip().replace(" ", "")
    if not nif.isdigit() or not (9 <= len(nif) <= 14):
        return False, ""
    # Heuristic: NIFs starting with 5 or 6 are typically corporate (Coletiva)
    tipo = "Coletiva" if nif[0] in ("5", "6") else "Singular"
    return True, tipo
