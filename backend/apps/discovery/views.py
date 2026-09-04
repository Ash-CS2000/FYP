"""
Discover Topics — a read-only proxy onto OpenAlex.

Every view here is public and every view here is cached. Both matter:

  Public, because the page is reachable logged out and a bearer token buys
  nothing against an external catalogue.

  Cached, because OpenAlex's rate limit is a shared resource. Without a cache,
  one person clicking through fields would spend it, and their limit becomes our
  outage.

Nothing in this module reads or writes our database. No manuscript of ours is
ever returned from here — that separation is the whole point of the feature.
"""
import logging

from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .client import (
    OpenAlexError,
    list_field_topics,
    list_fields,
    list_topic_works,
    search_works,
    short_id,
)

logger = logging.getLogger(__name__)

# How long each kind of answer stays fresh. Generous on purpose — this is
# reference data measured in months, not a live feed. The 26 fields change maybe
# once a year; a topic's citation count moves slowly; even a works list is fine
# an hour old.
#
# Note the project configures no CACHES backend, so this is Django's default
# per-process LocMemCache: the cache is per worker and empty after a restart.
# Fine at this scale. If Discover ever gets real traffic, a shared backend
# (Redis) would stop every worker fetching the same field list separately.
TTL_FIELDS = 60 * 60 * 24   # a day
TTL_TOPICS = 60 * 60 * 6    # six hours
TTL_WORKS = 60 * 60         # an hour


class _DiscoveryView(APIView):
    """Shared configuration for every Discover endpoint.

    permission/authentication mirror PublishedManuscriptListView in
    apps/manuscripts/views.py: authentication_classes is emptied rather than
    left to default, because DRF authenticates *before* it checks permissions —
    so with JWT auth on, a visitor holding an expired token would get a 401 from
    a page that is meant to be public.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'discovery'

    def cached(self, key, ttl, produce):
        """Return a cached result, or produce and store one.

        An upstream failure becomes a 502 with a readable message. A discovery
        page that cannot reach its source should say so; it must not hand the
        browser a stack trace, and it must not look like *our* server is broken
        when it is not.
        """
        hit = cache.get(key)
        if hit is not None:
            return Response(hit)

        try:
            value = produce()
        except OpenAlexError as exc:
            logger.warning('OpenAlex request failed for %s: %s', key, exc)
            return Response(
                {'detail': 'Could not reach the research index. Please try again shortly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cache.set(key, value, timeout=ttl)
        return Response(value)


def _limit(request, default, ceiling):
    try:
        value = int(request.query_params.get('limit', default))
    except (TypeError, ValueError):
        return default
    return max(1, min(value, ceiling))


class FieldListView(_DiscoveryView):
    """GET /api/discover/fields/ → the top-level research fields, A–Z.

    26 today. The client must not hardcode that number — it is OpenAlex's
    classification and they have revised it before.
    """

    def get(self, request):
        return self.cached('discover:fields:v1', TTL_FIELDS, list_fields)


class FieldTopicListView(_DiscoveryView):
    """GET /api/discover/fields/<field_id>/topics/ → topics within one field."""

    def get(self, request, field_id):
        limit = _limit(request, 40, 200)
        key = f'discover:topics:v1:{short_id(field_id)}:{limit}'
        return self.cached(key, TTL_TOPICS, lambda: list_field_topics(field_id, limit=limit))


class TopicWorkListView(_DiscoveryView):
    """GET /api/discover/topics/<topic_id>/works/ → papers under one topic.

    ?sort=cited (default) | recent
    """

    def get(self, request, topic_id):
        sort = request.query_params.get('sort', 'cited')
        limit = _limit(request, 25, 100)
        key = f'discover:works:v1:{short_id(topic_id)}:{sort}:{limit}'
        return self.cached(
            key, TTL_WORKS, lambda: list_topic_works(topic_id, sort=sort, limit=limit)
        )


class WorkSearchView(_DiscoveryView):
    """GET /api/discover/works/?q=&field=&sort=&limit= → search the literature.

    Submit-driven, not per-keystroke: each miss is an upstream request, and a
    two-character query matches most of a 250-million-row catalogue anyway.
    """
    MIN_QUERY = 2

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < self.MIN_QUERY:
            return Response(
                {'detail': f'Enter at least {self.MIN_QUERY} characters to search.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        field_id = short_id(request.query_params.get('field') or '')
        sort = request.query_params.get('sort', 'cited')
        limit = _limit(request, 25, 100)

        key = f'discover:search:v1:{q.lower()}:{field_id}:{sort}:{limit}'
        return self.cached(
            key, TTL_WORKS,
            lambda: search_works(q, field_id=field_id, sort=sort, limit=limit),
        )
