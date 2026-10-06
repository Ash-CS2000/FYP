"""
Transparent Fernet encryption for sensitive model fields.

Key is derived from Django's SECRET_KEY so no extra environment variable is
required.  If FIELD_ENCRYPTION_KEY is set in settings it takes priority (useful
for key rotation without changing SECRET_KEY).

Encrypted values are stored with the prefix "enc:" so the helpers can
distinguish them from legacy plain-text values that predate this module.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models

_ENCRYPTED_PREFIX = 'enc:'


def _fernet() -> Fernet:
    raw = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
    if raw:
        key = raw.encode() if isinstance(raw, str) else raw
    else:
        # Derive a 32-byte key from SECRET_KEY.
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_value(plaintext: str) -> str:
    """Return the Fernet-encrypted, prefixed form of *plaintext*."""
    if not plaintext:
        return plaintext
    return _ENCRYPTED_PREFIX + _fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(value: str) -> str:
    """Return the plaintext for an encrypted value, or the value unchanged if
    it was not encrypted with this module (legacy plain-text, blank, or None)."""
    if not value or not value.startswith(_ENCRYPTED_PREFIX):
        return value
    try:
        return _fernet().decrypt(value[len(_ENCRYPTED_PREFIX):].encode()).decode()
    except InvalidToken:
        return value  # wrong key or corrupted — return as-is rather than crash


class EncryptedCharField(models.CharField):
    """
    A CharField that encrypts its value before writing to the database and
    decrypts it transparently when reading.  Drop-in replacement for CharField;
    set max_length large enough to hold the ciphertext (~4× the plaintext length
    plus 50 bytes of overhead).
    """

    def from_db_value(self, value, expression, connection):
        return decrypt_value(value) if value else value

    def to_python(self, value):
        return decrypt_value(value) if value else value

    def get_prep_value(self, value):
        if not value:
            return value
        if value.startswith(_ENCRYPTED_PREFIX):
            return value  # already encrypted (e.g. a re-save without editing)
        return encrypt_value(value)
