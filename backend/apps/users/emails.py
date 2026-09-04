"""Outbound account emails (plain text — kept deliberately simple)."""
from django.conf import settings
from django.core.mail import send_mail


def _greeting(name):
    name = (name or '').strip()
    return f'Hello {name},' if name else 'Hello,'


def send_editor_invite_email(invite):
    """Invite link for someone who isn't in the system yet."""
    link = f'{settings.FRONTEND_BASE_URL}/editor-invite/{invite.token}'
    send_mail(
        subject='Your PaperBridge editor invitation',
        message=(
            f'{_greeting(invite.name)}\n\n'
            'An administrator has invited you to join PaperBridge as an editor.\n\n'
            'Set your password and activate your account here:\n'
            f'{link}\n\n'
            'This link expires in 72 hours. If you were not expecting this, you '
            'can ignore this email.\n'
        ),
        from_email=None,  # DEFAULT_FROM_EMAIL
        recipient_list=[invite.email],
        fail_silently=False,
    )


def send_reviewer_approved_email(user):
    """Notice for a reviewer application an admin has just approved."""
    send_mail(
        subject='Your PaperBridge reviewer account is active',
        message=(
            f'{_greeting(user.get_full_name())}\n\n'
            'An administrator has reviewed and approved your reviewer application. '
            'Your account is now active — log in to see the reviewer workspace and '
            'receive review invitations.\n'
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_editor_role_added_email(user):
    """Notice for an existing account that was granted the editor role."""
    send_mail(
        subject='You now have editor access on PaperBridge',
        message=(
            f'{_greeting(user.get_full_name())}\n\n'
            'An administrator has granted your existing PaperBridge account the '
            'editor role. Log in as usual and choose the Editor workspace.\n'
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )
