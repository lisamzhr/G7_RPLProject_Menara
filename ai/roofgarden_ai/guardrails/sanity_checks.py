"""Deterministic sanity check assertions for LLM output."""

import re

from roofgarden_ai.contracts import ZoneContext

# Konstanta yang boleh dikutip, cocok persis (bukan toleransi)
EXACT_CONSTANTS = {1.0, 2.0, 3.0, 6.0, 24.0}
_NUM_RE = re.compile(r"\b\d+(?:\.\d+)?\b")

# Aksi pengaktuasi yang tidak boleh disarankan kalau bukan aksi dari rule engine
_ACTION_PATTERNS = {
    "water": re.compile(r"\b(?:water|watering|irrigate|irrigation|sprinkler)\b"),
    "shade": re.compile(r"\b(?:shade|shading)\b"),
    "add_light": re.compile(r"\b(?:add light|add_light|grow light|extra light|supplemental light)\b"),
    "check_device": re.compile(r"\b(?:check the device|check device|check_device|inspect the sensor)\b"),
}
_NEG_BEFORE = re.compile(
    r"\b(?:no|not|don't|do not|doesn't|avoid|skip|without|unnecessary|instead of|rather than)\b"
)
_NEG_AFTER = re.compile(r"\b(?:not|isn't|is not|unnecessary)\b")


def verify_severity(llm_severity: str, expected_rule_level: str) -> tuple[bool, str]:
    """Verify LLM severity matches rule engine level exactly."""
    if llm_severity != expected_rule_level:
        return False, f"Severity mismatch: LLM said '{llm_severity}', rule engine computed '{expected_rule_level}'"
    return True, ""


def _extract_numbers(text: str) -> list[float]:
    # "25,000" -> "25000" supaya tidak terpecah jadi 25 dan 000
    text = re.sub(r"(?<=\d),(?=\d{3}\b)", "", text)
    return [float(n) for n in _NUM_RE.findall(text)]


def verify_quoted_numbers(text: str, ctx: ZoneContext) -> tuple[bool, str]:
    """Verify numbers quoted in the explanation match real context metrics."""
    # Angka sensor & threshold: boleh meleset +-1.05 (atau 5% untuk > 1000)
    tolerant = [
        ctx.current_moisture, ctx.current_temp, ctx.current_humidity, ctx.current_lux,
        ctx.rain_chance_next_3h,
        ctx.thresholds.moisture_min, ctx.thresholds.moisture_max,
        ctx.thresholds.temp_min, ctx.thresholds.temp_max,
        ctx.thresholds.humidity_min, ctx.thresholds.humidity_max,
        ctx.thresholds.lux_min, ctx.thresholds.lux_max,
    ]
    # Angka dari source_note (mis. "FAO-56", tahun) boleh dikutip apa adanya
    exact = set(EXACT_CONSTANTS) | set(_extract_numbers(ctx.thresholds.source_note))

    for val in _extract_numbers(text):
        if any(abs(val - e) < 1e-9 for e in exact):
            continue
        matched = False
        for ref in tolerant:
            tol = ref * 0.05 if ref > 1000 else 1.05
            if abs(val - ref) <= tol:
                matched = True
                break
        if not matched:
            return False, f"Hallucinated number detected: '{val:g}' does not match any sensor metric or threshold"

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


def verify_action_consistency(text: str, action_type: str) -> tuple[bool, str]:
    """LLM must not suggest an actuating action other than the rule engine's action."""
    lower = text.lower()
    for act, pattern in _ACTION_PATTERNS.items():
        if act == action_type:
            continue
        for m in pattern.finditer(lower):
            before = lower[max(0, m.start() - 30):m.start()]
            after = lower[m.end():m.end() + 20]
            if _NEG_BEFORE.search(before) or _NEG_AFTER.search(after):
                continue  # "no need to water", "watering is not needed"
            return False, f"Action mismatch: text mentions '{m.group(0)}' but rule engine action is '{action_type}'"
    return True, ""