"""Tests for guardrails validating severity, numbers, forecast consistency, and fallback activation."""

import json

import pytest

from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.guardrails.validator import validate_and_filter_llm_response
from roofgarden_ai.llm.claude_client import MockLLMClient
from roofgarden_ai.orchestrator import evaluate
from roofgarden_ai.rule_engine.thresholds import load_category_profile


@pytest.fixture
def test_ctx():
    profile = load_category_profile("leafy")
    return ZoneContext(
        zone_id="zone-guardrail-test",
        zone_label="Test Zone",
        category_key="leafy",
        thresholds=profile,
        current_moisture=65.0, # Below 76 min -> warning!
        current_temp=26.0,
        current_humidity=70.0,
        current_lux=15000.0,
        rain_chance_next_3h=60.0,
    )


def test_guardrail_rejects_severity_mismatch(test_ctx):
    bad_llm_json = json.dumps({
        "message": "Everything looks fine with moisture at 65.0%.",
        "severity": "normal", # Wrong! Expected is 'warning'
        "reasons": ["Mock reason"]
    })
    rec, err = validate_and_filter_llm_response(bad_llm_json, test_ctx, expected_rule_level="warning")
    assert rec is None
    assert "Severity mismatch" in err


def test_guardrail_rejects_hallucinated_number(test_ctx):
    bad_llm_json = json.dumps({
        "message": "Moisture is at 999.0% which is unprecedented.", # 999.0 is made up!
        "severity": "warning",
        "reasons": ["Wild number cited"]
    })
    rec, err = validate_and_filter_llm_response(bad_llm_json, test_ctx, expected_rule_level="warning")
    assert rec is None
    assert "Hallucinated number detected" in err


def test_guardrail_rejects_rain_contradiction(test_ctx):
    bad_llm_json = json.dumps({
        "message": "Moisture is 65.0%. Please water now to prevent wilting.",
        "severity": "warning",
        "reasons": ["Drying out"]
    })
    rec, err = validate_and_filter_llm_response(bad_llm_json, test_ctx, expected_rule_level="warning")
    assert rec is None
    assert "Contradiction" in err


def test_orchestrator_activates_fallback_on_corrupt_llm(test_ctx):
    # LLM outputs non-JSON garbage
    corrupt_mock = MockLLMClient(predefined_response="This is not JSON at all! 42 1000")
    decision = evaluate(test_ctx, llm_client=corrupt_mock)

    assert decision.used_fallback is True
    assert decision.overall_level == "warning"
    assert decision.recommendation.status_level == "warning"
    assert "65.0%" in decision.recommendation.message
