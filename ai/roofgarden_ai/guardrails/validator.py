"""Pydantic validator and guardrail coordinator."""

import json
import logging

from pydantic import BaseModel, Field, ValidationError

from roofgarden_ai.contracts import Recommendation, ZoneContext
from roofgarden_ai.guardrails.sanity_checks import (
    verify_no_contradiction_with_forecast,
    verify_quoted_numbers,
    verify_severity,
)

logger = logging.getLogger("roofgarden_ai.guardrails")


class LLMStructuredOutput(BaseModel):
    message: str
    severity: str
    reasons: list[str] = Field(default_factory=list)


def validate_and_filter_llm_response(
    raw_text: str,
    ctx: ZoneContext,
    expected_rule_level: str,
) -> tuple[Recommendation | None, str | None]:
    """Parse raw LLM output, validate JSON schema, and run deterministic sanity checks.

    Returns:
        (Recommendation, None) on success
        (None, error_reason) on validation/sanity failure
    """
    # 1. Parse JSON
    try:
        # Strip potential markdown fences
        cleaned = raw_text.strip()
        cleaned = cleaned.removeprefix("```json")
        cleaned = cleaned.removeprefix("```")
        cleaned = cleaned.removesuffix("```")
        data = json.loads(cleaned.strip())
        parsed = LLMStructuredOutput(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        logger.warning(f"Guardrail failed: JSON/Schema validation error: {e}")
        return None, f"JSON/Schema error: {e}"

    # 2. Check Severity Match
    ok_sev, err_sev = verify_severity(parsed.severity, expected_rule_level)
    if not ok_sev:
        logger.warning(f"Guardrail failed: {err_sev}")
        return None, err_sev

    # 3. Check Quoted Numbers
    combined_text = f"{parsed.message} {' '.join(parsed.reasons)}"
    ok_num, err_num = verify_quoted_numbers(combined_text, ctx)
    if not ok_num:
        logger.warning(f"Guardrail failed: {err_num}")
        return None, err_num

    # 4. Check Forecast Contradiction
    ok_cast, err_cast = verify_no_contradiction_with_forecast(combined_text, ctx)
    if not ok_cast:
        logger.warning(f"Guardrail failed: {err_cast}")
        return None, err_cast

    recommendation = Recommendation(
        status_level=parsed.severity,  # type: ignore
        message=parsed.message,
        reasons=parsed.reasons,
    )
    return recommendation, None
