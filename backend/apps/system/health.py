"""
Live checks behind the admin dashboard's System Health card.

Each check measures something real at the moment it runs. Uptime is deliberately
absent: a server cannot record the time it was down, so any uptime figure shown
from inside the app would be invented.
"""
import time
from concurrent.futures import ThreadPoolExecutor

import boto3
import requests
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.db import connection
from django.utils import timezone

from .sessions import signed_in_user_count

OK, DEGRADED, DOWN, INFO = 'ok', 'degraded', 'down', 'info'
SEVERITY = {OK: 0, DEGRADED: 1, DOWN: 2}


def _ms(start):
    return round((time.perf_counter() - start) * 1000)


def check_database():
    try:
        start = time.perf_counter()
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        ms = _ms(start)
    except Exception:
        return {'status': DOWN, 'value': 'Unreachable', 'detail': 'A test query to the database failed.'}
    status = OK if ms < 250 else DEGRADED if ms < 1000 else DOWN
    return {'status': status, 'value': f'{ms} ms', 'detail': 'Time for a test query to come back.'}


def check_storage():
    required = (
        settings.SUPABASE_S3_ENDPOINT_URL, settings.SUPABASE_S3_BUCKET,
        settings.SUPABASE_S3_ACCESS_KEY_ID, settings.SUPABASE_S3_SECRET_ACCESS_KEY,
    )
    if not all(required):
        return {'status': DOWN, 'value': 'Not configured',
                'detail': 'Storage settings are missing, so file uploads cannot work.'}
    # A separate client with short timeouts: the shared one in manuscripts.storage
    # has none, and a health check must never hang the dashboard.
    client = boto3.client(
        's3',
        endpoint_url=settings.SUPABASE_S3_ENDPOINT_URL,
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=settings.SUPABASE_S3_REGION,
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'},
                      connect_timeout=3, read_timeout=4, retries={'max_attempts': 1}),
    )
    try:
        start = time.perf_counter()
        client.head_bucket(Bucket=settings.SUPABASE_S3_BUCKET)
        ms = _ms(start)
    except ClientError as exc:
        code = str(exc.response.get('Error', {}).get('Code', ''))
        value = {'403': 'Access denied', '404': 'Bucket not found', 'NoSuchBucket': 'Bucket not found'}.get(code, 'Error')
        return {'status': DOWN, 'value': value, 'detail': 'Storage answered but refused the request.'}
    except (BotoCoreError, Exception):
        return {'status': DOWN, 'value': 'Unreachable', 'detail': 'No response from the storage service.'}
    if ms < 1500:
        return {'status': OK, 'value': 'Connected', 'detail': f'Responded in {ms} ms.'}
    return {'status': DEGRADED, 'value': 'Slow', 'detail': f'Responded, but took {ms} ms.'}


def check_plagiarism_engine():
    url = f"{settings.NOPLAG_ENGINE_URL.rstrip('/')}/health"
    try:
        start = time.perf_counter()
        response = requests.get(url, timeout=(3, 5))
        ms = _ms(start)
    except requests.Timeout:
        # A free Render instance sleeps when idle and takes a while to wake, so a
        # timeout is not necessarily an outage.
        return {'status': DEGRADED, 'value': 'Not responding',
                'detail': 'No reply within 5 s — it may be waking up from sleep. Try again shortly.'}
    except requests.RequestException:
        return {'status': DOWN, 'value': 'Unreachable',
                'detail': 'Could not connect. New submissions will not be checked for similarity.'}
    if response.status_code != 200:
        return {'status': DOWN, 'value': f'Error {response.status_code}',
                'detail': 'The engine answered with an error. New submissions may not be checked.'}
    if ms < 2000:
        return {'status': OK, 'value': 'Online', 'detail': f'Responded in {ms} ms.'}
    return {'status': DEGRADED, 'value': 'Slow', 'detail': f'Responded, but took {ms} ms.'}


def check_signed_in_users():
    days = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].days
    count = signed_in_user_count()
    return {'status': INFO, 'value': f'{count:,}', 'detail': f'People with a valid login from the last {days} days.'}


def run_checks():
    """Every check, with the two network ones in parallel so a slow service
    costs its own timeout, not the sum of all of them."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        storage = pool.submit(check_storage)
        engine = pool.submit(check_plagiarism_engine)
        # Database work stays on this thread: Django connections are per-thread.
        database = check_database()
        signed_in = check_signed_in_users()
        results = [
            ('database', 'Database', database),
            ('storage', 'File storage', storage.result()),
            ('plagiarism_engine', 'Plagiarism engine', engine.result()),
            ('signed_in_users', 'Signed-in users', signed_in),
        ]

    checks = [{'key': key, 'label': label, **result} for key, label, result in results]
    worst = max((SEVERITY[c['status']] for c in checks if c['status'] != INFO), default=0)
    overall = {0: 'operational', 1: 'degraded', 2: 'down'}[worst]
    return {'overall': overall, 'checked_at': timezone.now().isoformat(), 'checks': checks}
