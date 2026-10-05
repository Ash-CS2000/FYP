from rest_framework import serializers

from .models import Review, ReviewAssessment, ReviewAssignment


class ReviewerAssignmentSerializer(serializers.Serializer):
    """
    Reviewer-facing shape — GET /api/reviewer/assignments/. No author
    identity anywhere: double-blind starts at the invitation, not the review
    form. See frontend/src/api/invitations.js.
    """
    id = serializers.IntegerField()
    manuscript_id = serializers.IntegerField()
    title = serializers.CharField(source='manuscript.title')
    category = serializers.CharField(source='manuscript.category')
    abstract = serializers.CharField(source='manuscript.abstract')
    invited_at = serializers.DateTimeField()
    respond_by = serializers.DateTimeField()
    due_at = serializers.DateTimeField(allow_null=True)
    responded_at = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
    decline_reason = serializers.CharField()
    decline_note = serializers.CharField()
    coi_declared = serializers.BooleanField()
    extension = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()

    def get_extension(self, obj):
        if not obj.extension_status:
            return None
        return {
            'requested_days': obj.extension_requested_days,
            'reason': obj.extension_reason,
            'status': obj.extension_status,
        }

    def get_review(self, obj):
        review = getattr(obj, 'review', None)
        if review is None:
            return None
        assessment = getattr(review, 'assessment', None)
        assessed_by = 'The Editorial Office'
        if assessment and assessment.assessed_by:
            assessed_by = assessment.assessed_by.get_full_name() or assessment.assessed_by.email
        return {
            'submitted_at': review.submitted_at,
            'ratings': {
                'originality': review.originality,
                'technical': review.technical,
                'clarity': review.clarity,
                'relevance': review.relevance,
            },
            'recommendation': review.recommendation,
            'summary': review.summary,
            'strengths': review.strengths,
            'weaknesses': review.weaknesses,
            'confidential_to_editor': review.confidential_to_editor,
            'assessment': {
                'quality': assessment.quality,
                'accuracy': assessment.accuracy,
                'errors': assessment.errors,
                'note': assessment.note,
                'assessed_at': assessment.assessed_at,
                'assessed_by': assessed_by,
            } if assessment else None,
        }


class ManuscriptAssignmentSerializer(serializers.Serializer):
    """
    Editor-facing shape — GET /api/manuscripts/<pk>/assignments/. Who is
    invited/reviewing this manuscript right now, for ReviewerPanel.jsx.
    """
    id = serializers.IntegerField()
    reviewer_id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    status = serializers.CharField()
    round = serializers.IntegerField()
    invited_at = serializers.DateTimeField()
    due_at = serializers.DateTimeField(allow_null=True)
    extension = serializers.SerializerMethodField()
    # Audit trail from invite time (apps/matching/ranking.py) and the
    # authorship flag set by apps/manuscripts/signals.py.
    match_score = serializers.IntegerField(allow_null=True)
    model_version = serializers.CharField()
    authorship_conflict_at = serializers.DateTimeField(allow_null=True)

    def get_name(self, obj):
        return obj.reviewer.get_full_name() or obj.reviewer.email

    def get_extension(self, obj):
        if not obj.extension_status:
            return None
        return {
            'requested_days': obj.extension_requested_days,
            'reason': obj.extension_reason,
            'status': obj.extension_status,
        }


class InviteReviewersSerializer(serializers.Serializer):
    reviewer_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    respond_by_days = serializers.IntegerField(required=False, default=7, min_value=1, max_value=60)
    due_days = serializers.IntegerField(required=False, default=21, min_value=1, max_value=180)
    force = serializers.BooleanField(required=False, default=False)


class AcceptAssignmentSerializer(serializers.Serializer):
    coi_declared = serializers.BooleanField(required=False, default=False)
    coi_note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['coi_declared'] and not data['coi_note'].strip():
            raise serializers.ValidationError({'coi_note': 'Describe the conflict.'})
        data['coi_note'] = data['coi_note'].strip()
        return data


class DeclineAssignmentSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=ReviewAssignment.DeclineReason.choices)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        note = data.get('note', '').strip()
        if data['reason'] == ReviewAssignment.DeclineReason.OTHER and not note:
            raise serializers.ValidationError({'note': 'Say a little more when the reason is "other".'})
        data['note'] = note
        return data


class RecuseAssignmentSerializer(serializers.Serializer):
    note = serializers.CharField()

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError('Say what came up.')
        return value.strip()


class ExtensionRequestSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, max_value=30)
    reason = serializers.CharField()

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError('Give the editor a reason.')
        return value.strip()


class ExtensionDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[ReviewAssignment.ExtensionStatus.GRANTED, ReviewAssignment.ExtensionStatus.REFUSED])


def reviewer_labels_for(manuscript):
    """'Reviewer 1', 'Reviewer 2', ... keyed by assignment id, positional by
    invitation order across the manuscript's whole history (not just the
    currently-shown subset) so a label never shifts once assigned. Never the
    reviewer's real name — see ReviewerAssignmentSerializer for why."""
    ordered = manuscript.review_assignments.order_by('invited_at')
    return {a.id: f'Reviewer {i + 1}' for i, a in enumerate(ordered)}


class ManuscriptReviewSerializer(serializers.Serializer):
    """
    Editor-facing shape — GET /api/manuscripts/<pk>/reviews/. One row per
    ReviewAssignment with status accepted or submitted; review content is
    null until the reviewer actually submits, so an editor can see who's
    still working rather than have rows appear out of nowhere later.
    Expects context={'labels': reviewer_labels_for(manuscript)}.
    """
    id = serializers.IntegerField()
    manuscript_id = serializers.IntegerField()
    reviewer_label = serializers.SerializerMethodField()
    status = serializers.CharField()
    submitted_at = serializers.SerializerMethodField()
    ratings = serializers.SerializerMethodField()
    recommendation = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    strengths = serializers.SerializerMethodField()
    weaknesses = serializers.SerializerMethodField()
    confidential_to_editor = serializers.SerializerMethodField()
    # Set when the reviewer became an author after submitting -- the review is
    # kept for the record but withheld from the author (see signals.py).
    authorship_conflict_at = serializers.DateTimeField(allow_null=True)
    assessment = serializers.SerializerMethodField()

    def get_reviewer_label(self, obj):
        return self.context.get('labels', {}).get(obj.id, 'Reviewer')

    def get_submitted_at(self, obj):
        review = getattr(obj, 'review', None)
        return review.submitted_at if review else None

    def get_ratings(self, obj):
        review = getattr(obj, 'review', None)
        if review is None:
            return None
        return {
            'originality': review.originality, 'technical': review.technical,
            'clarity': review.clarity, 'relevance': review.relevance,
        }

    def get_recommendation(self, obj):
        review = getattr(obj, 'review', None)
        return review.recommendation if review else None

    def get_summary(self, obj):
        review = getattr(obj, 'review', None)
        return review.summary if review else None

    def get_strengths(self, obj):
        review = getattr(obj, 'review', None)
        return review.strengths if review else None

    def get_weaknesses(self, obj):
        review = getattr(obj, 'review', None)
        return review.weaknesses if review else None

    def get_confidential_to_editor(self, obj):
        review = getattr(obj, 'review', None)
        return review.confidential_to_editor if review else None

    def get_assessment(self, obj):
        review = getattr(obj, 'review', None)
        if review is None:
            return None
        assessment = getattr(review, 'assessment', None)
        if assessment is None:
            return None
        assessed_by = 'The Editorial Office'
        if assessment.assessed_by:
            assessed_by = assessment.assessed_by.get_full_name() or assessment.assessed_by.email
        return {
            'quality': assessment.quality,
            'accuracy': assessment.accuracy,
            'errors': assessment.errors,
            'note': assessment.note,
            'assessed_at': assessment.assessed_at,
            'assessed_by': assessed_by,
        }


class AuthorReviewSerializer(serializers.Serializer):
    """
    Author-facing shape — GET /api/manuscripts/<pk>/reviews/author/. The
    allow-list from data/editorial.js's toAuthorReview(): no ratings, no
    recommendation, no confidential_to_editor, no reviewer identity beyond
    the same positional label the editor sees. `obj` is a Review instance.
    Expects context={'labels': reviewer_labels_for(manuscript)}.
    """
    id = serializers.IntegerField()
    label = serializers.SerializerMethodField()
    summary = serializers.CharField()
    strengths = serializers.CharField()
    weaknesses = serializers.CharField()

    def get_label(self, obj):
        return self.context.get('labels', {}).get(obj.assignment_id, 'Reviewer')


# A one-word "ok" is not a review. Mirrored by MIN_TEXT in frontend/src/pages/ReviewForm.jsx.
MIN_REVIEW_TEXT = 50


class ReviewCreateSerializer(serializers.Serializer):
    originality = serializers.IntegerField(min_value=1, max_value=5)
    technical = serializers.IntegerField(min_value=1, max_value=5)
    clarity = serializers.IntegerField(min_value=1, max_value=5)
    relevance = serializers.IntegerField(min_value=1, max_value=5)
    recommendation = serializers.ChoiceField(choices=Review.Recommendation.choices)
    summary = serializers.CharField()
    strengths = serializers.CharField()
    weaknesses = serializers.CharField()
    confidential_to_editor = serializers.CharField(required=False, allow_blank=True, default='')

    @staticmethod
    def _require_text(value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Required.')
        if len(value) < MIN_REVIEW_TEXT:
            raise serializers.ValidationError(f'Write at least {MIN_REVIEW_TEXT} characters.')
        return value

    def validate_summary(self, value):
        return self._require_text(value)

    def validate_strengths(self, value):
        return self._require_text(value)

    def validate_weaknesses(self, value):
        return self._require_text(value)

    def validate_confidential_to_editor(self, value):
        return value.strip()


class ReviewAssessmentSerializer(serializers.ModelSerializer):
    assessed_by = serializers.SerializerMethodField()

    class Meta:
        model = ReviewAssessment
        fields = ('quality', 'accuracy', 'errors', 'note', 'assessed_by', 'assessed_at')
        read_only_fields = ('assessed_by', 'assessed_at')

    def get_assessed_by(self, obj):
        if not obj.assessed_by:
            return 'The Editorial Office'
        return obj.assessed_by.get_full_name() or obj.assessed_by.email

    def validate_quality(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Quality must be between 1 and 5.')
        return value

    def validate_accuracy(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Accuracy must be between 1 and 5.')
        return value

    def validate_errors(self, value):
        if value < 0 or value > 20:
            raise serializers.ValidationError('Errors must be between 0 and 20.')
        return value

    def validate_note(self, value):
        return value.strip()


class ManuscriptForReviewerSerializer(serializers.Serializer):
    """
    Reviewer-facing manuscript content — GET /api/manuscripts/<pk>/reviewer-view/.
    Deliberately separate from ManuscriptSerializer: no owner, no authors, no
    cover letter, no declarations. A reviewer needs to read the paper, not
    learn who wrote it — same "two endpoints, two serialisers" principle as
    getAuthorReviews vs the editor reviews endpoint.
    """
    id = serializers.IntegerField()
    title = serializers.CharField()
    abstract = serializers.CharField()
    category = serializers.CharField()
    sub_category = serializers.CharField()
    keywords = serializers.CharField()
    file_name = serializers.CharField()
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        from apps.manuscripts import storage
        return storage.get_file_url(obj.file_key)
