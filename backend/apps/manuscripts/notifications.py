"""
Notification copy for editorial decisions. Short summaries — the full letter
lives on Decision.letter, read via the decision-fetch endpoint, not duplicated
here.
"""
from .models import Decision, ScreeningAction

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

SCREENING_NOTIFICATION_TITLES = {
    ScreeningAction.Action.ALLOW: 'Your manuscript passed screening',
    ScreeningAction.Action.RETURN: 'Your manuscript was returned by the editor',
}

SCREENING_NOTIFICATION_BODIES = {
    ScreeningAction.Action.ALLOW: '"{title}" cleared the similarity screen and will continue to review.',
    ScreeningAction.Action.RETURN: '"{title}" was returned by the editor before review. See their note for details.',
}
