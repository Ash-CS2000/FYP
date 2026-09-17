"""
Pure unit tests for apps/manuscripts/conflicts.py -- no Django ORM, no
database. Builds AuthorIndex directly (bypassing .for_manuscript(), which
needs a real Manuscript queryset) and uses plain mock user objects instead
of real Django User/UserProfile instances.
"""
from types import SimpleNamespace

import pytest

from apps.manuscripts.conflicts import AuthorIndex, _norm_orcid, authorship_reason, soft_conflicts


def make_user(id, email, full_name, institution='', orcid_id=''):
    return SimpleNamespace(
        id=id, email=email,
        get_full_name=lambda: full_name,
        profile=SimpleNamespace(institution=institution, orcid_id=orcid_id),
    )


def make_index(owner_id=1, emails=None, orcids=None, names=None, institutions=None):
    return AuthorIndex(
        owner_id=owner_id,
        emails=emails or set(),
        orcids=orcids or set(),
        names=names or {},
        institutions=institutions or set(),
    )


# -- authorship_reason (HARD, non-overridable) -----------------------------

def test_owner_is_flagged_as_author():
    user = make_user(1, 'owner@example.com', 'Owner Person')
    index = make_index(owner_id=1)
    assert authorship_reason(index, user) is not None


def test_non_owner_non_author_is_not_flagged():
    user = make_user(2, 'someone@example.com', 'Some One')
    index = make_index(owner_id=1, emails={'author@example.com'})
    assert authorship_reason(index, user) is None


def test_email_match_is_case_and_whitespace_insensitive():
    user = make_user(2, '  Author@Example.com  ', 'Author Name')
    index = make_index(owner_id=1, emails={'author@example.com'})
    # authorship_reason normalises the CANDIDATE's email too via _norm_email
    # inside the function -- but user.email itself is raw here, matching
    # what a real Django User field would contain.
    assert authorship_reason(index, user) is not None


def test_orcid_match_handles_url_and_bare_forms():
    user = make_user(2, 'x@example.com', 'X Y', orcid_id='https://orcid.org/0000-0001-2345-6789')
    index = make_index(owner_id=1, orcids={'0000-0001-2345-6789'})
    assert authorship_reason(index, user) is not None


def test_orcid_match_is_case_insensitive_on_the_id_itself():
    user = make_user(2, 'x@example.com', 'X Y', orcid_id='0000-0001-2345-678x')
    index = make_index(owner_id=1, orcids={'0000-0001-2345-678X'})
    assert authorship_reason(index, user) is not None


@pytest.mark.parametrize('typed', [
    '0000-0001-2345-6789',
    'https://orcid.org/0000-0001-2345-6789',
    'http://www.orcid.org/0000-0001-2345-6789/',
    'orcid.org/0000-0001-2345-6789',
    'https://sandbox.orcid.org/0000-0001-2345-6789',
    '0000000123456789',
    '  0000-0001-2345-6789  ',
])
def test_orcid_normalises_every_common_way_of_typing_it(typed):
    assert _norm_orcid(typed) == '0000-0001-2345-6789'
    user = make_user(2, 'x@example.com', 'X Y', orcid_id=typed)
    index = make_index(owner_id=1, orcids={_norm_orcid('https://orcid.org/0000-0001-2345-6789')})
    assert authorship_reason(index, user) is not None


def test_orcid_checksum_x_is_uppercased_and_different_ids_do_not_match():
    assert _norm_orcid('0000-0002-1694-233x') == '0000-0002-1694-233X'
    assert _norm_orcid('0000-0001-2345-6789') != _norm_orcid('0000-0001-2345-6788')
    assert _norm_orcid('') == ''


def test_no_user_returns_none():
    index = make_index(owner_id=1, emails={'a@example.com'})
    assert authorship_reason(index, None) is None


# -- soft_conflicts (overridable) ------------------------------------------

def test_same_institution_is_a_soft_conflict_only():
    user = make_user(2, 'reviewer@example.com', 'Reviewer Person', institution='University of Malaya')
    index = make_index(owner_id=1, institutions={'university of malaya'})
    assert authorship_reason(index, user) is None
    conflicts = soft_conflicts(index, user)
    assert len(conflicts) == 1
    assert 'institution' in conflicts[0].lower()


def test_name_match_with_different_email_is_a_soft_conflict_only():
    # Same full name as a listed author, but the reviewer's account uses a
    # different email -- flagged for a human to verify, not blocked outright.
    user = make_user(2, 'reviewer-personal@example.com', 'Jane Doe')
    index = make_index(owner_id=1, names={'jane doe': {'jane.doe@university.edu'}})
    assert authorship_reason(index, user) is None
    conflicts = soft_conflicts(index, user)
    assert any('name' in c.lower() for c in conflicts)


def test_name_match_with_matching_email_is_not_a_soft_conflict():
    # If the name AND email both match an author, that's the HARD case
    # (covered by authorship_reason via the email set), not a soft one --
    # soft_conflicts should not also flag it as a "different email" warning.
    user = make_user(2, 'jane.doe@university.edu', 'Jane Doe')
    index = make_index(owner_id=1, names={'jane doe': {'jane.doe@university.edu'}})
    conflicts = soft_conflicts(index, user)
    assert not any('different email' in c.lower() for c in conflicts)


def test_accented_name_matches_plain_ascii_form():
    user = make_user(2, 'reviewer@example.com', 'José García')
    index = make_index(owner_id=1, names={'jose garcia': {'author@example.com'}})
    conflicts = soft_conflicts(index, user)
    assert len(conflicts) == 1


def test_no_conflict_for_an_unrelated_reviewer():
    user = make_user(2, 'unrelated@example.com', 'Unrelated Person', institution='Some University')
    index = make_index(
        owner_id=1, emails={'author@example.com'}, institutions={'other university'},
        names={'another author': {'author@example.com'}},
    )
    assert authorship_reason(index, user) is None
    assert soft_conflicts(index, user) == []
