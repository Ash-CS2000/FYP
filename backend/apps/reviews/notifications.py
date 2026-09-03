"""
Notification copy for the reviewer assignment lifecycle. Short summaries —
the reviewer/editor read the full context (abstract, note, reason) on the
assignment itself, not duplicated here.
"""

REVIEW_INVITE_TITLE = 'You have been invited to review a manuscript'
REVIEW_INVITE_BODY = 'You have been asked to review "{title}". Respond by {respond_by}.'

REVIEW_ACCEPTED_TITLE = 'A reviewer accepted your invitation'
REVIEW_ACCEPTED_BODY = '{reviewer} accepted the invitation to review "{title}".'

REVIEW_DECLINED_TITLE = 'A reviewer declined your invitation'
REVIEW_DECLINED_BODY = '{reviewer} declined to review "{title}".'

REVIEW_RECUSED_TITLE = 'A reviewer recused themselves'
REVIEW_RECUSED_BODY = '{reviewer} recused themselves from reviewing "{title}" after accepting.'

REVIEW_REMINDER_TITLE = 'Reminder: a review is waiting on you'
REVIEW_REMINDER_BODY = 'The editor sent a reminder about your review of "{title}".'

REVIEW_EXTENSION_REQUESTED_TITLE = 'A reviewer requested more time'
REVIEW_EXTENSION_REQUESTED_BODY = '{reviewer} requested {days} extra day(s) on "{title}".'

REVIEW_EXTENSION_GRANTED_TITLE = 'Your extension was granted'
REVIEW_EXTENSION_GRANTED_BODY = 'Your extension request on "{title}" was granted. Check the new deadline.'

REVIEW_EXTENSION_REFUSED_TITLE = 'Your extension was refused'
REVIEW_EXTENSION_REFUSED_BODY = 'Your extension request on "{title}" was refused. The original deadline stands.'

REVIEW_SUBMITTED_TITLE = 'A review has been submitted'
REVIEW_SUBMITTED_BODY = '{reviewer} submitted their review of "{title}".'
