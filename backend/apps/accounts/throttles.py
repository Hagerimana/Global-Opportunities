"""Throttle classes guarding the credential endpoints.

Authentication endpoints are the most attractive target on any API: they accept
unlimited guesses at an email/password pair. DRF throttles protect them by
counting requests per client address over a rolling window.
"""

from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Limits unauthenticated credential attempts by client address.

    `AnonRateThrottle` keys on IP address, which is the only identifier
    available before a user has authenticated. Subclassing it just to set
    `scope` keeps the throttle re-usable and self-documenting.
    """

    # Resolved against REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], which sets
    # "auth": "5/minute" -- so five login or register attempts per minute per IP.
    scope = "auth"
