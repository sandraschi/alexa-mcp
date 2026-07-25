"""Heuristics to refuse TTS for phrases that could trigger Amazon / voice-purchase flows."""

from __future__ import annotations

import os
import re

# Order tracking, refunds — not new purchases
_INFO = re.compile(
    r"(?i)(order status|where('s| is) my order|wheres my order|track(ing| my| the)?\s+"
    r"order|view (my|the) orders?|list my orders|refund|return( item)?\b)",
)
# “Buy / order / cart” style phrasing; only blocks when combined with an Amazon context (below)
_VERB = re.compile(
    r"(?i)\b(orders?|reorders?|reorder(ing)?|buy(ing)?|purchas(e|ing|es)?|"
    r"place(\s+an?)?\s+order|one[- ]?click|checkout|subscribe\s+and\s+save)\b",
)
# e.g. “add to cart”, “add shampoo to my cart”
_ADD_TO_CART = re.compile(
    r"(?i)\badd(ing|)?\s+("
    r"to(\s+my)?\s+cart"  # add to cart / add to my cart
    r"|"
    r".+?\s+to(\s+my)?\s+cart"  # add <item> to (my) cart
    r")\b",
)


def _media_intent(s: str) -> bool:
    """Return whether the line is plausibly about Amazon media, not shopping."""
    return (
        re.search(
            r"(?i)amazon( prime)?\s+(music|video|luna|photos|kids|reading|classroom|studios)\b|"
            r"prime video|watch on amazon|"
            r"\bplay( some| my)?\s+.*\b(amazon|prime music|audible)\b|"
            r"on\s+amazon\s*(music|video|prime video)\b",
            s,
        )
        is not None
    )


def _has_amazon_commerce_context(s: str) -> bool:
    """Return whether the text plausibly refers to shopping on Amazon, not e.g. Prime Video."""
    s = s.strip()
    if "prime now" in s.lower():
        return True
    if re.search(r"(?i)whole foods", s) and re.search(r"(?i)\b(order|buy|checkout)\b", s):
        return True
    if re.search(r"(?i)from\s+amazon\b", s) and not _media_intent(s):
        return True
    if re.search(r"(?i)on\s+amazon\b", s) and not _media_intent(s):
        return True
    if re.search(r"(?i)amazon\.(com|co\.\w+)|\bwww\.amazon\b", s) and not _media_intent(s):
        return True
    if re.search(r"(?i)\bamazon\b", s) and not _media_intent(s):
        return True
    return False


def is_blocked_amazon_shopping_speak(text: str) -> bool:
    """Return True if we should refuse to speak this string (heuristic, not legal advice)."""
    t = (text or "").strip()
    if not t or _INFO.search(t):
        return False
    if not _has_amazon_commerce_context(t):
        return False
    if _ADD_TO_CART.search(t) is not None:
        return True
    return _VERB.search(t) is not None


def assert_speak_policy_allows(text: str) -> None:
    """Raise ValueError if the shopping guard is enabled and ``text`` matches refusal heuristics."""
    v = os.environ.get("ALEXA_SHOPPING_GUARD", "1").strip().lower()
    if v in ("0", "false", "no", "off"):
        return
    if is_blocked_amazon_shopping_speak(text):
        raise ValueError(
            "Refused: this command looks like a possible Amazon / voice-purchase phrasing. "
            "Narrow the request, rephrase a tracking question only, or (not recommended) set environment "
            "ALEXA_SHOPPING_GUARD=0 after accepting the risk. See README: Security."
        )
