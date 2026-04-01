"""Angola vehicle licence plate validation.
Format: LD-00-00-HD (2 letters - 2 digits - 2 digits - 2 letters)
Example: LD-12-34-AB
"""
import re

PATTERNS = [
    re.compile(r"^[A-Z]{2}-\d{2}-\d{2}-[A-Z]{2}$"),  # Angola standard: LD-00-00-HD
    re.compile(r"^[A-Z]{2}\d{2}\d{2}[A-Z]{2}$"),       # without dashes
]


def validate_matricula(plate: str) -> bool:
    plate = plate.strip().upper()
    # Normalise: insert dashes if missing (LDXXXXHD → LD-XX-XX-HD)
    if re.match(r"^[A-Z]{2}\d{4}[A-Z]{2}$", plate):
        plate = f"{plate[:2]}-{plate[2:4]}-{plate[4:6]}-{plate[6:]}"
    return any(p.match(plate) for p in PATTERNS)
