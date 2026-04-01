"""Angola provinces — replaces Portuguese postal code validation."""

ANGOLA_PROVINCES = [
    "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango",
    "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla",
    "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico",
    "Namibe", "Uíge", "Zaire",
]


def validate_provincia(provincia: str) -> bool:
    return provincia.strip() in ANGOLA_PROVINCES
