"""
Notification copy for editorial decisions. Short summaries — the full letter
lives on Decision.letter, read via the decision-fetch endpoint, not duplicated
here.
"""
from .models import Decision

DECISION_NOTIFICATION_TITLES = {
    Decision.Type.ACCEPT: 'Your manuscript was accepted',
    Decision.Type.REJECT: 'A decision has been made on your manuscript',
    Decision.Type.DESK_REJECT: 'A decision has been made on your manuscript',
    Decision.Type.MINOR: 'Minor revisions requested',
    Decision.Type.MAJOR: 'Major revisions requested',
}

DECISION_NOTIFICATION_BODIES = {
    Decision.Type.ACCEPT: '"{title}" has been accepted for publication.',
    Decision.Type.REJECT: '"{title}" was not accepted for publication. See the decision letter for details.',
    Decision.Type.DESK_REJECT: '"{title}" was not sent out for review. See the decision letter for details.',
    Decision.Type.MINOR: '"{title}" needs minor revisions before it can be accepted. See the decision letter for details.',
    Decision.Type.MAJOR: '"{title}" needs major revisions and a second review round. See the decision letter for details.',
}

REVISION_SUBMITTED_NOTIFICATION_TITLE = 'A revision has been submitted'
REVISION_SUBMITTED_NOTIFICATION_BODY = '"{title}" has a new revision from the author, ready for a decision.'
