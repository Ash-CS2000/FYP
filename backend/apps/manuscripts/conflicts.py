"""
Authorship and conflict-of-interest checks for reviewer/editor assignment.

Two tiers, deliberately kept separate:

  - HARD (authorship): the candidate wrote this manuscript. Never
    overridable by `force`, checked at every enforcement point (ranking,
    invite, model save, accept/submit/view, and editorial actions), because
    a reviewer or editor judging their own paper isn't a risk to flag for a
    human to weigh — it's not a valid state at all.

  - SOFT (everything else the old compute_conflict covered — same
    institution, or a name match with a different email): still just a
    signal for the editor to weigh, overridable with `force`.

`AuthorIndex` is built once per manuscript (one query for authors, one for
their affiliations) so ranking a pool of N reviewers costs O(1) queries for
conflicts instead of the old O(N) (see matching_system.md 'Previous
approach' for why that mattered).
"""
import re
import unicodedata


def _norm_email(value):
    return (value or '').strip().lower()


_ORCID_ID = re.compile(r'(\d{4})-?(\d{4})-?(\d{4})-?(\d{3}[\dX])', re.IGNORECASE)


def _norm_orcid(value):
    """Canonical 'XXXX-XXXX-XXXX-XXXX' form of an ORCID iD, whichever way it
    was typed: bare, hyphen-less, with or without https://, www., sandbox.,
    a trailing slash, or a lowercase x -- so the byline's free-text ORCID and
    the bare iD stored by ORCID sign-in always compare equal."""
    if not value:
        return ''
    match = _ORCID_ID.search(value)
    if match:
        return '-'.join(match.groups()).upper()
    return value.strip().upper()


def _norm_name(value):
    """Casefold + strip accents, so 'José García' matches 'jose garcia'."""
    if not value:
        return ''
    decomposed = unicodedata.normalize('NFKD', value)
    stripped = ''.join(c for c in decomposed if not unicodedata.combining(c))
    return ' '.join(stripped.casefold().split())


def _norm_institution(value):
    return ' '.join((value or '').strip().casefold().split())


class AuthorIndex:
    """A manuscript's authorship facts, loaded once and reused for every
    candidate checked against it."""

    def __init__(self, owner_id, emails, orcids, names, institutions):
        self.owner_id = owner_id
        self.emails = emails
        self.orcids = orcids
        self.names = names  # name -> set of emails (for the soft name-mismatch check)
        self.institutions = institutions

    @classmethod
    def for_manuscript(cls, manuscript):
        emails = set()
        orcids = set()
        names = {}
        institutions = set()

        owner_email = _norm_email(getattr(manuscript.owner, 'email', ''))
        if owner_email:
            emails.add(owner_email)

        authors = list(
            manuscript.authors.all().prefetch_related('affiliations')
        )
        for author in authors:
            email = _norm_email(author.email)
            orcid = _norm_orcid(author.orcid)
            name = _norm_name(f'{author.given_name} {author.family_name}')
            if email:
                emails.add(email)
            if orcid:
                orcids.add(orcid)
            if name:
                names.setdefault(name, set())
                if email:
                    names[name].add(email)
            for affiliation in author.affiliations.all():
                institution = _norm_institution(affiliation.institution)
                if institution:
                    institutions.add(institution)

        return cls(
            owner_id=manuscript.owner_id,
            emails=emails,
            orcids=orcids,
            names=names,
            institutions=institutions,
        )


def authorship_reason(index, user):
    """HARD check — non-overridable. Returns a human-readable reason, or
    None if `user` is not an author of the manuscript this index was built
    from."""
    if user is None:
        return None
    if index.owner_id == user.id:
        return 'This reviewer submitted this manuscript.'

    email = _norm_email(user.email)
    if email and email in index.emails:
        return 'This reviewer is a listed author on this manuscript.'

    orcid = _norm_orcid(getattr(getattr(user, 'profile', None), 'orcid_id', ''))
    if orcid and orcid in index.orcids:
        return 'This reviewer is a listed author on this manuscript (matched by ORCID).'

    return None


def soft_conflicts(index, user):
    """SOFT checks — overridable with `force`. Returns a list of reason
    strings (usually 0 or 1 entries)."""
    if user is None:
        return []
    reasons = []

    institution = _norm_institution(getattr(getattr(user, 'profile', None), 'institution', ''))
    if institution and institution in index.institutions:
        reasons.append('Same institution as a listed co-author.')

    name = _norm_name(user.get_full_name())
    email = _norm_email(user.email)
    if name and name in index.names:
        author_emails = index.names[name]
        if email not in author_emails:
            reasons.append(
                'Name matches a listed author who used a different email address — verify before inviting.'
            )

    return reasons


def authored_manuscript_ids(user):
    """Ids of every manuscript `user` is a HARD author of (submitter, byline
    email, or byline ORCID), in a fixed number of queries -- for list views
    that would otherwise build an AuthorIndex per row. Same rules as
    authorship_reason()."""
    from django.db.models import Q

    from .models import Manuscript, ManuscriptAuthor

    if user is None or not user.is_authenticated:
        return set()
    query = Q(owner_id=user.id)
    email = _norm_email(user.email)
    if email:
        query |= Q(authors__email__iexact=email)
    ids = set(Manuscript.objects.filter(query).values_list('id', flat=True))

    orcid = _norm_orcid(getattr(getattr(user, 'profile', None), 'orcid_id', ''))
    if orcid:
        # ORCIDs are free text on the byline; narrow by the last block, then
        # compare normalised forms in Python.
        rows = ManuscriptAuthor.objects.filter(orcid__icontains=orcid[-4:]).values_list('manuscript_id', 'orcid')
        ids |= {manuscript_id for manuscript_id, value in rows if _norm_orcid(value) == orcid}
    return ids


def is_author_of(manuscript, user):
    """Convenience wrapper for a single (manuscript, user) check — builds an
    AuthorIndex just for this call. Prefer AuthorIndex.for_manuscript() once
    and reuse it when checking many candidates against the same manuscript
    (see apps/matching/ranking.py)."""
    return authorship_reason(AuthorIndex.for_manuscript(manuscript), user) is not None


def compute_conflict(manuscript, user):
    """Backwards-compatible wrapper: the old apps.reviews.matching module
    exposed this name for a single combined (soft-only) conflict string.
    Kept so any caller still importing it (there shouldn't be any after this
    change, but Django admin/shell usage is easy to miss) keeps working.
    Hard authorship is intentionally NOT included here — callers that need
    the non-overridable check must use authorship_reason() explicitly."""
    reasons = soft_conflicts(AuthorIndex.for_manuscript(manuscript), user)
    return reasons[0] if reasons else None


def authorship_block(assignment):
    """Reviewer-side HARD check for an existing assignment, run by the
    reviewer's own endpoints (accept, submit review, view manuscript). If the
    reviewer has become an author since they were invited -- e.g. they linked
    the byline's ORCID after the invite -- a live (invited/accepted) assignment
    is auto-declined exactly like the author-change signal does. Returns the
    reason string (caller responds 403), or None if they may proceed."""
    reason = authorship_reason(AuthorIndex.for_manuscript(assignment.manuscript), assignment.reviewer)
    if reason is None:
        return None
    from apps.reviews.models import ReviewAssignment
    if assignment.status in (ReviewAssignment.Status.INVITED, ReviewAssignment.Status.ACCEPTED):
        from .signals import auto_decline_for_authorship
        auto_decline_for_authorship(assignment)
    return reason
