"""AES-256-GCM field-level encryption for sensitive data."""
import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


def _get_key() -> bytes:
    key_hex = settings.ENCRYPTION_KEY
    return bytes.fromhex(key_hex)


def encrypt(plaintext: str) -> str:
    """Encrypt a string, return base64-encoded nonce+ciphertext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    """Decrypt a base64-encoded nonce+ciphertext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    data = base64.b64decode(token)
    nonce, ct = data[:12], data[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
