"""Tests for TTS shopping / Amazon voice-order heuristics."""

import pytest

from alexa_mcp.speak_policy import assert_speak_policy_allows, is_blocked_amazon_shopping_speak


def test_allows_benign_and_weather() -> None:
    """Normal commands and short speech are not blocked."""
    assert not is_blocked_amazon_shopping_speak("Alexa, what is the weather in Vienna?")
    assert not is_blocked_amazon_shopping_speak("Hello.")


def test_allows_order_tracking() -> None:
    """Order tracking is not treated as a new purchase."""
    assert not is_blocked_amazon_shopping_speak("Where is my order on Amazon?")


def test_allows_amazon_music() -> None:
    """Media phrases are not treated as Amazon retail checkout."""
    assert not is_blocked_amazon_shopping_speak("Play jazz on Amazon Music")


def test_blocks_order_on_amazon() -> None:
    """Explicit buy/order/cart on Amazon is blocked when the guard is on."""
    assert is_blocked_amazon_shopping_speak("Alexa, order 20 nail files on Amazon")
    assert is_blocked_amazon_shopping_speak("Buy toilet paper on amazon.com")
    assert is_blocked_amazon_shopping_speak("add shampoo to my cart on Amazon")


def test_assert_respects_env_off(monkeypatch: pytest.MonkeyPatch) -> None:
    """ALEXA_SHOPPING_GUARD=0 disables the refusal."""
    monkeypatch.setenv("ALEXA_SHOPPING_GUARD", "0")
    # would otherwise block
    assert_speak_policy_allows("Buy toilet paper on Amazon")


def test_assert_raises_when_on(monkeypatch: pytest.MonkeyPatch) -> None:
    """Guard on raises ValueError for shopping-shaped lines."""
    monkeypatch.setenv("ALEXA_SHOPPING_GUARD", "1")
    with pytest.raises(ValueError, match="Refused"):
        assert_speak_policy_allows("Order batteries on Amazon")


def test_env_unset_defaults_to_guard_on(monkeypatch: pytest.MonkeyPatch) -> None:
    """Missing env var keeps the default guard behavior."""
    monkeypatch.delenv("ALEXA_SHOPPING_GUARD", raising=False)
    with pytest.raises(ValueError, match="Refused"):
        assert_speak_policy_allows("Order batteries on Amazon")
