"""
Thin wrapper around Supabase Storage's S3-compatible API (via boto3).
Files are stored under private keys; callers get a presigned URL on read.
"""
import io
import uuid

import boto3
from botocore.config import Config
from django.conf import settings


_client_instance = None


def _client():
    # Built once per process and reused — constructing a boto3 client isn't
    # free (it resolves credentials and loads service definitions), and every
    # serializer that computes a file_url calls this, often many times in one
    # request (once per manuscript, once per supplementary file, ...).
    global _client_instance
    if _client_instance is None:
        _client_instance = boto3.client(
            's3',
            endpoint_url=settings.SUPABASE_S3_ENDPOINT_URL,
            aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
            region_name=settings.SUPABASE_S3_REGION,
            config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
        )
    return _client_instance

def download_file(key):
    """Downloads a file from Supabase Storage and returns its raw bytes."""
    buffer = io.BytesIO()
    _client().download_fileobj(settings.SUPABASE_S3_BUCKET, key, buffer)
    buffer.seek(0)
    return buffer.read()

def build_key(owner_id, category, filename):
    safe_name = filename.replace('/', '_')
    return f'manuscripts/{owner_id}/{category}/{uuid.uuid4().hex}-{safe_name}'


def build_avatar_key(user_id, filename):
    """Key for a profile photo.

    Deliberately outside the `manuscripts/` prefix: seed_demo_data's reset wipes
    every key under that prefix, and re-seeding demo manuscripts should not strip
    people's avatars.
    """
    safe_name = filename.replace('/', '_')
    return f'avatars/{user_id}/{uuid.uuid4().hex}-{safe_name}'


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


def list_all_keys(prefix='manuscripts/'):
    """List every object key under a prefix in the bucket."""
    client = _client()
    paginator = client.get_paginator('list_objects_v2')
    keys = []
    for page in paginator.paginate(Bucket=settings.SUPABASE_S3_BUCKET, Prefix=prefix):
        keys.extend(obj['Key'] for obj in page.get('Contents', []))
    return keys


def delete_files(keys):
    """Delete objects by key. One request per key — Supabase Storage's
    S3-compatible endpoint doesn't support the batch DeleteObjects operation."""
    if not keys:
        return
    client = _client()
    for key in keys:
        client.delete_object(Bucket=settings.SUPABASE_S3_BUCKET, Key=key)

