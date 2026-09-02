from rest_framework.throttling import SimpleRateThrottle
from django.core.cache import cache
import time


class ProgressiveAuthThrottle(SimpleRateThrottle):
    """
    Progressive rate limiting for login/register:
    
    Stage 1: 0-3 attempts   → 3 per minute (normal)
    Stage 2: 4-6 attempts   → 1 per minute (slow down)
    Stage 3: 7-9 attempts   → 1 per 3 minutes (very slow)
    Stage 4: 10+ attempts   → 1 per hour (near lockout)
    """
    scope = 'progressive_auth'
    STAGES = [
        # (max_attempts, wait_seconds, label)
        (3,  20,   '3 per minute'),    # Stage 1: every 20s = 3/min
        (6,  60,   '1 per minute'),    # Stage 2: every 60s = 1/min
        (9,  180,  '1 per 3 minutes'), # Stage 3: every 3min
        (999, 3600, '1 per hour'),     # Stage 4: every 1hr
    ]

    def get_cache_key(self, request, view):
        # Track by IP address
        ip = self._get_ip(request)
        return f'progressive_throttle:{ip}'

    def get_attempt_key(self, request):
        ip = self._get_ip(request)
        return f'progressive_attempts:{ip}'

    def _get_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')

    def allow_request(self, request, view):
        ip = self._get_ip(request)
        attempt_key = f'progressive_attempts:{ip}'
        last_attempt_key = f'progressive_last:{ip}'

        # Get current attempt count
        attempts = cache.get(attempt_key, 0)

        # Find which stage we're in
        stage = self._get_stage(attempts)
        wait_seconds = stage[1]

        # Check time since last attempt
        last_attempt_time = cache.get(last_attempt_key, 0)
        now = time.time()
        elapsed = now - last_attempt_time

        # Stage 1 is a burst allowance: the first few attempts pass with no
        # spacing (matches the "3 per minute" intent). Spacing is only enforced
        # from stage 2 on, once repeated attempts look like real hammering.
        # Without this, a quick logout/login or a single password typo — or the
        # register → auto-login round-trip — trips the 20s gate.
        burst_allowance = self.STAGES[0][0]
        if attempts >= burst_allowance and elapsed < wait_seconds:
            # Too soon — calculate wait time
            self.wait_time = wait_seconds - elapsed
            return False

        # Allow request — increment attempt count
        cache.set(attempt_key, attempts + 1, timeout=3600)  # reset after 1hr
        cache.set(last_attempt_key, now, timeout=3600)
        return True

    def _get_stage(self, attempts):
        for max_attempts, wait_seconds, label in self.STAGES:
            if attempts < max_attempts:
                return (max_attempts, wait_seconds, label)
        return self.STAGES[-1]  # stage 4 — 1 per hour

    def wait(self):
        return getattr(self, 'wait_time', 60)

    def get_rate(self):
        return None  # we handle rate manually above

    def on_success(self, request):
        """Reset attempt count on successful login."""
        ip = self._get_ip(request)
        cache.delete(f'progressive_attempts:{ip}')
        cache.delete(f'progressive_last:{ip}')