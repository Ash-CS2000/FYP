from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.users.taxonomy import SPECIALTY_TAG_LABELS

from .tagging import suggest_tags

MAX_TEXT_CHARS = 5000  # longer text is truncated, not rejected


class SuggestTagsSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, max_length=50000)


class SuggestTagsView(APIView):
    """
    POST /api/matching/suggest-tags/  body: {"text": "..."}
    -> {"suggestions": [{"slug", "label", "similarity"}, ...]}

    Suggests specialty tags for free text (an abstract, an expertise blurb)
    with the TF-IDF tag classifier in apps/matching/tagging.py. `similarity`
    is the classifier's probability, or a TF-IDF cosine for the label-match
    fallback. Suggestions only -- nothing is applied automatically, and
    validate_specialty_tags() still governs what a client may actually save.
    See matching_system.md 'Specialty tags'.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'matching'

    def post(self, request):
        serializer = SuggestTagsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data['text'][:MAX_TEXT_CHARS]

        suggestions = [
            {'slug': slug, 'label': SPECIALTY_TAG_LABELS.get(slug, slug), 'similarity': round(score, 3)}
            for slug, score in suggest_tags(text)
        ]
        return Response({'suggestions': suggestions})
