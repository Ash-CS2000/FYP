import ipaddress

from .models import AuditLog


def _display_name(user):
    return (user.get_full_name() or user.email) if user else ''


def client_ip(request):
    """The caller's IP, or None.

    Behind the hosting proxy REMOTE_ADDR is the proxy itself, so the first
    X-Forwarded-For hop is preferred. That header is client-supplied and can be
    forged, so treat the value as a lead, not proof. Anything that is not a valid
    address is dropped: Postgres stores this column as inet and would reject it,
    failing the action being recorded.
    """
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    candidate = forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', '')
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def record(*, type, action, summary, actor=None, target=None, target_email='',
           role='', reason='', details=None, request=None):
    """Write one audit entry.

    Call inside the same transaction as the action it describes wherever there is
    one, so an action cannot be committed without its record.
    """
    return AuditLog.objects.create(
        type=type,
        action=action,
        summary=summary[:500],
        actor=actor if (actor and actor.is_authenticated) else None,
        actor_name=_display_name(actor) if (actor and actor.is_authenticated) else '',
        actor_email=actor.email if (actor and actor.is_authenticated) else '',
        target=target,
        target_name=_display_name(target),
        target_email=target.email if target else target_email,
        role=role,
        reason=reason or '',
        details=details or {},
        ip_address=client_ip(request),
    )
