"""Deterministic sanity check assertions for LLM output."""

import re

from roofgarden_ai.contracts import ZoneContext

ALLOWED_ACTION_WORDS = {"water", "watering", "wait", "waiting", "shade", "shading", "light", "add_light", "check_device"}


def verify_severity(llm_severity: str, expected_rule_level: str) -> tuple[bool, str]:
    """Verify LLM severity matches rule engine level exactly."""
    if llm_severity != expected_rule_level:
        return False, f"Severity mismatch: LLM said '{llm_severity}', rule engine computed '{expected_rule_level}'"
    return True, ""


def verify_quoted_numbers(text: str, ctx: ZoneContext) -> tuple[bool, str]:
    """Verify that numbers quoted in explanation match real context metrics within +-1.0."""
    # Context numbers that the LLM is legitimately permitted to quote
    valid_numbers = [
        ctx.current_moisture,
        ctx.current_temp,
        ctx.current_humidity,
        ctx.current_lux,
        ctx.rain_chance_next_3h,
        ctx.thresholds.moisture_min,
        ctx.thresholds.moisture_max,
        ctx.thresholds.temp_min,
        ctx.thresholds.temp_max,
        ctx.thresholds.humidity_min,
        ctx.thresholds.humidity_max,
        ctx.thresholds.lux_min,
        ctx.thresholds.lux_max,
        3.0, # 3 hours forecast window
        6.0, # 6 hours slope window
        24.0, # 24h
        1.0, 2.0, # small count integers
    ]

    # Extract all floating point and integer numbers from text
    found_numbers = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    for num_str in found_numbers:
        val = float(num_str)
        # Check if val matches at least one legitimate context number within +-1.0
        # (or within 5% for large numbers like lux > 1000)
        matched = False
        for valid_val in valid_numbers:
            if valid_val > 1000:
                if abs(val - valid_val) <= (valid_val * 0.05):
                    matched = True
                    break
            else:
                if abs(val - valid_val) <= 1.05:
                    matched = True
                    break

        if not matched:
            return False, f"Hallucinated number detected: '{num_str}' does not match any sensor metric or threshold"

    return True, ""


def verify_no_contradiction_with_forecast(text: str, ctx: ZoneContext) -> tuple[bool, str]:
    """Ensure LLM does not recommend immediate watering when heavy rain is imminent."""
    if ctx.rain_chance_next_3h >= 50.0:
        lower = text.lower()
        forbidden_phrases = ["water now", "turn on sprinkler immediately", "irrigate now", "water right away"]
        for phrase in forbidden_phrases:
            if phrase in lower:
                return False, f"Contradiction: recommended '{phrase}' despite rain chance of {ctx.rain_chance_next_3h:.0f}%"

    return True, ""
