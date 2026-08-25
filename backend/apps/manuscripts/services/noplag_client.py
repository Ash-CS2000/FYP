"""
Thin client for the self-hosted noplag plagiarism-check engine.
"""
import requests
from django.conf import settings

from apps.manuscripts import storage


class NoPlagClientError(Exception):
    pass


def _auth_headers():
    headers = {}
    if settings.NOPLAG_API_KEY:
        headers['Authorization'] = f'Bearer {settings.NOPLAG_API_KEY}'
    return headers


def _manuscript_file(manuscript):
    file_bytes = storage.download_file(manuscript.file_key)
    return {'file': (manuscript.file_name or 'manuscript.pdf', file_bytes, 'application/pdf')}


def submit_check(manuscript):
    """
    Uploads the manuscript PDF to noplag for checking.
    Returns the parsed JSON: {check_id, status_url, progress_url, report_url}.
    """
    url = f"{settings.NOPLAG_ENGINE_URL.rstrip('/')}/v1/checks/upload"

    try:
        response = requests.post(url, files=_manuscript_file(manuscript), headers=_auth_headers(), timeout=60)
    except requests.RequestException as exc:
        raise NoPlagClientError(f'Could not reach noplag engine: {exc}') from exc

    if response.status_code != 202:
        raise NoPlagClientError(f'noplag engine returned {response.status_code}: {response.text[:500]}')

    return response.json()


def add_to_corpus(manuscript):
    """
    Uploads a completed manuscript PDF to noplag's corpus so future checks can
    match against it. The engine deduplicates byte-identical uploads by sha256.
    Returns the parsed corpus document metadata.
    """
    url = f"{settings.NOPLAG_ENGINE_URL.rstrip('/')}/v1/corpus/documents"

    try:
        response = requests.post(url, files=_manuscript_file(manuscript), headers=_auth_headers(), timeout=60)
    except requests.RequestException as exc:
        raise NoPlagClientError(f'Could not reach noplag engine: {exc}') from exc

    if response.status_code not in (200, 201):
        raise NoPlagClientError(f'noplag corpus returned {response.status_code}: {response.text[:500]}')

    return response.json()


def get_check_status(check_id):
    """
    Polls the status of a submitted check.
    Returns the parsed JSON: {id, status, stage, overall_similarity_pct, error_message, ...}.
    """
    url = f"{settings.NOPLAG_ENGINE_URL.rstrip('/')}/v1/checks/{check_id}"

    try:
        response = requests.get(url, headers=_auth_headers(), timeout=30)
    except requests.RequestException as exc:
        raise NoPlagClientError(f'Could not reach noplag engine: {exc}') from exc

    if response.status_code != 200:
        raise NoPlagClientError(f'noplag engine returned {response.status_code}: {response.text[:500]}')

    return response.json()


def get_check_report(check_id):
    """
    Fetches the full plagiarism report for a completed check.
    Returns the parsed JSON: {title, overall_similarity_pct, sources, unique_passages, ...}.
    """
    url = f"{settings.NOPLAG_ENGINE_URL.rstrip('/')}/v1/checks/{check_id}/report"

    try:
        response = requests.get(url, headers=_auth_headers(), timeout=30)
    except requests.RequestException as exc:
        raise NoPlagClientError(f'Could not reach noplag engine: {exc}') from exc

    if response.status_code != 200:
        raise NoPlagClientError(f'noplag engine returned {response.status_code}: {response.text[:500]}')

    return response.json()
