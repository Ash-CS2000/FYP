import json

from django.db import transaction
from rest_framework import serializers

from . import storage
from .models import (
    Decision, Manuscript, ManuscriptAffiliation, ManuscriptAuthor, ManuscriptRevision,
    ManuscriptSupplementaryFile, PlagiarismCheck, ScreeningAction,
)
from .services.noplag_client import submit_check, NoPlagClientError

MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB — mirrors the frontend's MAX_UPLOAD_SIZE


def validate_pdf_file(value):
    is_pdf = value.content_type == 'application/pdf' or value.name.lower().endswith('.pdf')
    if not is_pdf:
        raise serializers.ValidationError('File must be a PDF.')
    if value.size > MAX_UPLOAD_SIZE:
        raise serializers.ValidationError('File exceeds the 20MB size limit.')
    return value


# ── Output (read) ────────────────────────────────────────────────────────────

class ManuscriptAffiliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManuscriptAffiliation
        fields = ('department', 'institution', 'city', 'country')


class ManuscriptAuthorSerializer(serializers.ModelSerializer):
    affiliations = ManuscriptAffiliationSerializer(many=True, read_only=True)

    class Meta:
        model = ManuscriptAuthor
        fields = ('title', 'given_name', 'family_name', 'degree', 'email', 'orcid', 'corresponding', 'affiliations')


class ManuscriptSupplementaryFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ManuscriptSupplementaryFile
        fields = ('file_name', 'file_size', 'file_url', 'uploaded_at')

    def get_file_url(self, obj):
        return storage.get_file_url(obj.file_key)


class ManuscriptSerializer(serializers.ModelSerializer):
    authors = ManuscriptAuthorSerializer(many=True, read_only=True)
    supplementary_files = ManuscriptSupplementaryFileSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Manuscript
        fields = (
            'id', 'article_type', 'title', 'running_title', 'abstract', 'category', 'sub_category',
            'keywords', 'file_name', 'file_size', 'file_url', 'cover_letter',
            'no_funding', 'funder', 'grant_no', 'no_competing', 'competing',
            'ethics_na', 'ethics', 'data_statement', 'status', 'submitted_at', 'updated_at',
            'authors', 'supplementary_files',
        )

    def get_file_url(self, obj):
        return storage.get_file_url(obj.file_key)


class ManuscriptEditorSerializer(serializers.ModelSerializer):
    """
    List-only serializer for the editor/admin "all submissions" view — flat,
    deliberately excludes authors/affiliations/supplementary_files/full report
    since the table never renders them.
    """
    owner_name = serializers.SerializerMethodField()
    plagiarism_check = serializers.SerializerMethodField()
    latest_decision = serializers.SerializerMethodField()

    class Meta:
        model = Manuscript
        fields = (
            'id', 'title', 'article_type', 'category', 'status', 'submitted_at', 'owner_name',
            'plagiarism_check', 'latest_decision',
        )

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() or obj.owner.email

    def get_plagiarism_check(self, obj):
        check = getattr(obj, 'plagiarism_check', None)
        if check is None:
            return None
        return {'status': check.status, 'similarity_score': check.similarity_score}

    def get_latest_decision(self, obj):
        decision = obj.decisions.first()  # Decision.Meta.ordering = -decided_at
        if decision is None:
            return None
        return {'type': decision.type, 'decided_at': decision.decided_at}


class DecisionSerializer(serializers.ModelSerializer):
    manuscript_id = serializers.IntegerField(read_only=True)
    decided_by = serializers.SerializerMethodField()

    class Meta:
        model = Decision
        fields = ('id', 'manuscript_id', 'type', 'letter', 'reasons', 'decided_by', 'decided_at')

    def get_decided_by(self, obj):
        if not obj.decided_by:
            return 'The Editorial Office'
        return obj.decided_by.get_full_name() or obj.decided_by.email


class DecisionCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=Decision.Type.choices)
    letter = serializers.CharField()
    reasons = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_letter(self, value):
        if not value.strip():
            raise serializers.ValidationError('The letter cannot be empty.')
        return value.strip()


class ScreeningActionSerializer(serializers.ModelSerializer):
    manuscript_id = serializers.IntegerField(read_only=True)
    acted_by = serializers.SerializerMethodField()

    class Meta:
        model = ScreeningAction
        fields = ('manuscript_id', 'action', 'note', 'acted_at', 'acted_by')

    def get_acted_by(self, obj):
        if not obj.acted_by:
            return 'The Editorial Office'
        return obj.acted_by.get_full_name() or obj.acted_by.email


class ScreeningActionCreateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=ScreeningAction.Action.choices)
    note = serializers.CharField()

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError('The note cannot be empty.')
        return value.strip()


# ── Nested input validation for the `authors` JSON blob ──────────────────────

class ManuscriptAffiliationInputSerializer(serializers.Serializer):
    department = serializers.CharField(required=False, allow_blank=True, max_length=255)
    institution = serializers.CharField(required=False, allow_blank=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, max_length=150)
    country = serializers.CharField(required=False, allow_blank=True, max_length=150)


class ManuscriptAuthorInputSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=10)
    given_name = serializers.CharField(max_length=150)
    family_name = serializers.CharField(max_length=150)
    degree = serializers.CharField(required=False, allow_blank=True, max_length=50)
    email = serializers.EmailField(required=False, allow_blank=True)
    orcid = serializers.CharField(required=False, allow_blank=True, max_length=50)
    corresponding = serializers.BooleanField(required=False, default=False)
    affiliations = ManuscriptAffiliationInputSerializer(many=True, required=False)


# ── Input (write) ──────────────────────────────────────────────────────────

class ManuscriptSubmitSerializer(serializers.Serializer):
    """
    POST /api/manuscripts/upload/ — multipart/form-data fields:
      article_type, title, running_title, abstract, category, sub_category, keywords,
      authors (JSON-encoded string — list of author objects, see ManuscriptAuthorInputSerializer),
      manuscript (file, required, PDF, <=20MB), supplementary (file[], optional),
      cover_letter, no_funding, funder, grant_no, no_competing, competing,
      ethics_na, ethics, data_statement,
      agreed_original, agreed_not_under_review, agreed_all_approve, agreed_policies
    """
    article_type = serializers.CharField(required=False, allow_blank=True, max_length=100)
    title = serializers.CharField(max_length=500)
    running_title = serializers.CharField(required=False, allow_blank=True, max_length=100)
    abstract = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True, max_length=255)
    sub_category = serializers.CharField(required=False, allow_blank=True, max_length=255)
    keywords = serializers.CharField(required=False, allow_blank=True, max_length=500)

    authors = serializers.CharField(write_only=True)

    manuscript = serializers.FileField(write_only=True)
    supplementary = serializers.ListField(
        child=serializers.FileField(), required=False, default=list, write_only=True,
    )
    cover_letter = serializers.CharField(required=False, allow_blank=True)

    no_funding = serializers.BooleanField(required=False, default=False)
    funder = serializers.CharField(required=False, allow_blank=True, max_length=255)
    grant_no = serializers.CharField(required=False, allow_blank=True, max_length=100)
    no_competing = serializers.BooleanField(required=False, default=False)
    competing = serializers.CharField(required=False, allow_blank=True)
    ethics_na = serializers.BooleanField(required=False, default=False)
    ethics = serializers.CharField(required=False, allow_blank=True)
    data_statement = serializers.CharField(required=False, allow_blank=True)

    agreed_original = serializers.BooleanField(required=False, default=False)
    agreed_not_under_review = serializers.BooleanField(required=False, default=False)
    agreed_all_approve = serializers.BooleanField(required=False, default=False)
    agreed_policies = serializers.BooleanField(required=False, default=False)

    # ── Field validation ─────────────────────────────────────────────────────

    def validate_authors(self, value):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('authors must be valid JSON.')
        if not isinstance(parsed, list) or not parsed:
            raise serializers.ValidationError('At least one author is required.')

        serializer = ManuscriptAuthorInputSerializer(data=parsed, many=True)
        serializer.is_valid(raise_exception=True)

        if not any(a.get('corresponding') for a in serializer.validated_data):
            raise serializers.ValidationError('Mark one author as the corresponding author.')

        return serializer.validated_data

    def validate_manuscript(self, value):
        return validate_pdf_file(value)

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, validated_data):
        owner = self.context['request'].user
        authors_data = validated_data.pop('authors')
        manuscript_file = validated_data.pop('manuscript')
        supplementary_files = validated_data.pop('supplementary', [])

        # Read the bytes once, here, so the plagiarism submit below can reuse
        # them instead of re-downloading the file we just pushed to storage.
        manuscript_bytes = manuscript_file.read()
        manuscript_file.seek(0)

        key = storage.build_key(owner.id, 'manuscript', manuscript_file.name)
        storage.upload_file(manuscript_file, key, content_type=manuscript_file.content_type)

        uploaded_supplementary = []
        for f in supplementary_files:
            supp_key = storage.build_key(owner.id, 'supplementary', f.name)
            storage.upload_file(f, supp_key, content_type=f.content_type)
            uploaded_supplementary.append((supp_key, f.name, f.size))

        with transaction.atomic():
            manuscript = Manuscript.objects.create(
                owner=owner,
                file_key=key,
                file_name=manuscript_file.name,
                file_size=manuscript_file.size,
                **validated_data,
            )

            for i, author_data in enumerate(authors_data):
                affiliations_data = author_data.pop('affiliations', [])
                author = ManuscriptAuthor.objects.create(manuscript=manuscript, order=i, **author_data)
                for aff in affiliations_data:
                    ManuscriptAffiliation.objects.create(author=author, **aff)

            for supp_key, name, size in uploaded_supplementary:
                ManuscriptSupplementaryFile.objects.create(
                    manuscript=manuscript, file_key=supp_key, file_name=name, file_size=size,
                )

        check = PlagiarismCheck.objects.create(manuscript=manuscript)
        try:
            result = submit_check(manuscript, file_bytes=manuscript_bytes)
        except NoPlagClientError as exc:
            check.status = PlagiarismCheck.Status.FAILED
            check.error_message = str(exc)
        else:
            check.check_id = result.get('check_id', '')
        check.save()

        return manuscript

    def to_representation(self, instance):
        return ManuscriptSerializer(instance, context=self.context).data


# ── Revisions ─────────────────────────────────────────────────────────────

class ManuscriptRevisionSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ManuscriptRevision
        fields = ('id', 'round', 'file_name', 'file_size', 'file_url', 'response_letter', 'submitted_at')

    def get_file_url(self, obj):
        return storage.get_file_url(obj.file_key)


class ManuscriptRevisionCreateSerializer(serializers.Serializer):
    """
    POST /api/manuscripts/<pk>/revision/ — multipart/form-data fields:
      manuscript (file, required, PDF, <=20MB), response_letter (optional)
    Expects context={'manuscript': <Manuscript instance>}.
    """
    manuscript = serializers.FileField(write_only=True)
    response_letter = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_manuscript(self, value):
        return validate_pdf_file(value)

    def create(self, validated_data):
        target = self.context['manuscript']
        owner = target.owner
        file = validated_data['manuscript']
        response_letter = validated_data.get('response_letter', '')

        key = storage.build_key(owner.id, 'revision', file.name)
        storage.upload_file(file, key, content_type=file.content_type)

        with transaction.atomic():
            round_number = target.revisions.count() + 1
            revision = ManuscriptRevision.objects.create(
                manuscript=target,
                round=round_number,
                file_key=key,
                file_name=file.name,
                file_size=file.size,
                response_letter=response_letter,
            )
            target.file_key = key
            target.file_name = file.name
            target.file_size = file.size
            target.status = Manuscript.Status.UNDER_REVIEW
            target.save(update_fields=['file_key', 'file_name', 'file_size', 'status', 'updated_at'])

        return revision

    def to_representation(self, instance):
        return ManuscriptRevisionSerializer(instance, context=self.context).data
