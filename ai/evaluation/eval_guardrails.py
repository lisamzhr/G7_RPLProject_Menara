"""Evaluation script for guardrails and assertion bounds."""

from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.guardrails.sanity_checks import verify_quoted_numbers, verify_severity
from roofgarden_ai.rule_engine.thresholds import load_category_profile


def run_guardrails_eval():
    profile = load_category_profile("leafy")
    ctx = ZoneContext(
        zone_id="test-zone",
        zone_label="Zone Leafy",
        category_key="leafy",
        thresholds=profile,
        current_moisture=75.0,
        current_temp=26.0,
        current_humidity=70.0,
        current_lux=15000.0,
    )

    # Valid check
    ok_sev, _ = verify_severity("warning", "warning")
    assert ok_sev

    # Invalid severity
    bad_sev, _ = verify_severity("normal", "warning")
    assert not bad_sev

    # Valid numbers
    ok_num, _ = verify_quoted_numbers("Current moisture is 75.0% and temperature is 26.0C.", ctx)
    assert ok_num

    # Hallucinated number
    bad_num, _ = verify_quoted_numbers("Current moisture is 999.0% which is strange.", ctx)
    assert not bad_num

    print("Guardrails evaluation test completed successfully.")


if __name__ == "__main__":
    run_guardrails_eval()
