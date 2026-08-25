"""
Thin wrapper around Supabase Storage's S3-compatible API (via boto3).
Files are stored under private keys; callers get a presigned URL on read.
"""
import io
import uuid

import boto3
from botocore.config import Config
from django.conf import settings


def _client():
    return boto3.client(
        's3',
        endpoint_url=settings.SUPABASE_S3_ENDPOINT_URL,
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=settings.SUPABASE_S3_REGION,
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )

def download_file(key):
    """Downloads a file from Supabase Storage and returns its raw bytes."""
    buffer = io.BytesIO()
    _client().download_fileobj(settings.SUPABASE_S3_BUCKET, key, buffer)
    buffer.seek(0)
    return buffer.read()

def build_key(owner_id, category, filename):
    safe_name = filename.replace('/', '_')
    return f'manuscripts/{owner_id}/{category}/{uuid.uuid4().hex}-{safe_name}'


def upload_file(file_obj, key, content_type=None):
    extra_args = {'ContentType': content_type} if content_type else {}
    _client().upload_fileobj(file_obj, settings.SUPABASE_S3_BUCKET, key, ExtraArgs=extra_args)
    return key


def get_file_url(key, expires_in=3600):
    if not key:
        return None
    return _client().generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.SUPABASE_S3_BUCKET, 'Key': key},
        ExpiresIn=expires_in,
    )

