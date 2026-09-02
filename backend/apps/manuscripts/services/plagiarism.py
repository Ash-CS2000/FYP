"""
Plagiarism corpus lifecycle — the orchestration that spans both the Django
models and the noplag engine client.

The rule this module enforces: a manuscript is prior art in the corpus only
*after it is accepted*. While it is still under review, keeping it out of the
corpus is what stops a revise-and-resubmit from being scored ~100% against the
author's own earlier draft.
"""
import logging

from ..models import PlagiarismCheck
from .noplag_client import (
    NoPlagClientError,
    add_to_corpus,
    delete_from_corpus,
    submit_check,
)

logger = logging.getLogger(__name__)


def sync_accepted_manuscript_to_corpus(manuscript):
    """Add an accepted manuscript to the noplag corpus as prior art.

    Called once, when the editor records an ACCEPT decision. Best-effort: a
    corpus failure is logged and never blocks the decision. Idempotent — a
    manuscript that already carries a corpus_document_id is left alone.
    """
    check = getattr(manuscript, 'plagiarism_check', None)
    if check is None or check.corpus_document_id:
        return

    try:
        corpus_doc = add_to_corpus(manuscript)
    except NoPlagClientError:
        logger.exception('Adding accepted manuscript %s to noplag corpus failed', manuscript.pk)
        return

    check.corpus_document_id = str(corpus_doc.get('id', ''))
    check.save(update_fields=['corpus_document_id'])


def restart_check_for_resubmission(manuscript, file_bytes=None):
    """Re-run the plagiarism check for a resubmitted manuscript version.

    Removes any corpus copy of the previous version first (so the new check is
    not scored against the author's own earlier draft), then resets the
    OneToOne PlagiarismCheck row and submits the new file to the engine.

    `file_bytes`: the new version's PDF bytes, if the caller already holds them
    (skips a storage round-trip). Otherwise the engine client downloads from
    storage via manuscript.file_key.

    Returns the updated PlagiarismCheck.
    """
    check, _ = PlagiarismCheck.objects.get_or_create(manuscript=manuscript)

    if check.corpus_document_id:
        try:
            delete_from_corpus(check.corpus_document_id)
        except NoPlagClientError:
            logger.exception(
                'Removing superseded corpus doc %s for manuscript %s failed',
                check.corpus_document_id, manuscript.pk,
            )
        check.corpus_document_id = ''

    check.status = PlagiarismCheck.Status.PENDING
    check.check_id = ''
    check.similarity_score = None
    check.report = None
    check.error_message = ''

    try:
        result = submit_check(manuscript, file_bytes=file_bytes)
    except NoPlagClientError as exc:
        check.status = PlagiarismCheck.Status.FAILED
        check.error_message = str(exc)
    else:
        check.check_id = result.get('check_id', '')

    check.save()
    return check
