"""IBAN Angola (AO) validation using MOD-97."""

ANGOLA_PROVINCES = [
    "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango",
    "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla",
    "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico",
    "Namibe", "Uíge", "Zaire",
]


def validate_iban(iban: str) -> bool:
    """Valida IBAN Angola (AO) com MOD-97. Formato: AO + 2 dígitos + 21 dígitos = 25 chars."""
    iban = iban.strip().replace(" ", "").upper()
    if len(iban) != 25 or not iban.startswith("AO"):
        return False
    rearranged = iban[4:] + iban[:4]
    numeric = ""
    for ch in rearranged:
        if ch.isalpha():
            numeric += str(ord(ch) - ord("A") + 10)
        else:
            numeric += ch
    return int(numeric) % 97 == 1
