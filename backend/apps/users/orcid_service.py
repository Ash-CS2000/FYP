"""
apps/users/orcid_service.py

ORCID OAuth 2.0 helper for production (orcid.org).

Flow:
  1. Frontend calls GET /api/users/orcid/url/ → gets auth_url + state
  2. Frontend redirects user to auth_url
  3. ORCID redirects back to your Vercel callback page with ?code=&state=
  4. Frontend POSTs { code, state } to /api/users/orcid/callback/
  5. Backend exchanges code → access token → fetches ORCID record → links/creates user
"""
import hashlib
import secrets
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_ORCID_TOKEN_URL = "{base}/oauth/token"
_ORCID_RECORD_URL = "{base}/v3.0/{orcid_id}/record"


def build_auth_url(state: str) -> str:
    """Construct the ORCID authorization URL the frontend should redirect to."""
    params = (
        f"client_id={settings.ORCID_CLIENT_ID}"
        f"&response_type=code"
        f"&scope=/authenticate"
        f"&redirect_uri={settings.ORCID_REDIRECT_URI}"
        f"&state={state}"
    )
    return f"{settings.ORCID_BASE_URL}/oauth/authorize?{params}"


def exchange_code_for_token(code: str) -> dict:
    """Exchange the one-time auth code for an access token + orcid id."""
    url = _ORCID_TOKEN_URL.format(base=settings.ORCID_BASE_URL)
    payload = {
        "client_id": settings.ORCID_CLIENT_ID,
        "client_secret": settings.ORCID_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.ORCID_REDIRECT_URI,
    }
    headers = {"Accept": "application/json"}

    resp = requests.post(url, data=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def fetch_orcid_record(orcid_id: str, access_token: str) -> dict:
    """Retrieve the public ORCID record for a given ORCID iD."""
    url = _ORCID_RECORD_URL.format(base=settings.ORCID_BASE_URL, orcid_id=orcid_id)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return _parse_record(resp.json(), orcid_id)


def _parse_record(data: dict, orcid_id: str) -> dict:
    """Extract first name, last name, and primary email from raw ORCID JSON."""
    person = data.get("person", {})

    name_block = person.get("name") or {}
    first_name = (name_block.get("given-names") or {}).get("value", "")
    last_name = (name_block.get("family-name") or {}).get("value", "")

    emails = (person.get("emails") or {}).get("email", [])
    primary_email = None
    for entry in emails:
        if entry.get("primary") and entry.get("verified"):
            primary_email = entry.get("email")
            break
    if not primary_email:
        for entry in emails:
            if entry.get("verified"):
                primary_email = entry.get("email")
                break

    return {
        "orcid_id": orcid_id,
        "email": primary_email,
        "first_name": first_name,
        "last_name": last_name,
    }


# ── State / CSRF helpers ──────────────────────────────────────────────────────

def generate_state() -> str:
    return secrets.token_urlsafe(32)


def hash_state(state: str) -> str:
    return hashlib.sha256(state.encode()).hexdigest()