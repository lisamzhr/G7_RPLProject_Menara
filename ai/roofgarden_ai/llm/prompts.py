"""Prompts for LLM explanation generation."""


from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.rule_engine.status import ParameterReading


def build_evaluation_prompt(
    ctx: ZoneContext,
    params: dict[str, ParameterReading],
    rule_level: str,
    action_type: str,
) -> str:
    """Build structured prompt for LLM explanation.

    Strict rules:
    - Never invent numbers.
    - Always output valid JSON with schema: {"message": str, "severity": str, "reasons": list[str]}
    - The severity MUST exactly equal rule_level.
    """
    param_summary = "\n".join(
        [
            f"- {p.name}: {p.value}{p.unit} (Ideal range: {p.ideal_min} - {p.ideal_max}{p.unit}, Status: {p.status})"
            for p in params.values()
        ]
    )

    return f"""You are an expert botanical assistant for an urban rooftop garden in Jakarta.
Your task is to write a helpful, plain-language explanation for a beginner gardener.

CURRENT SENSOR READINGS:
{param_summary}

ENVIRONMENTAL & WEATHER CONTEXT:
- BMKG Forecast: {ctx.weather_forecast_text}
- Rain chance in next 3 hours: {ctx.rain_chance_next_3h:.0f}%
- Plant Category: {ctx.category_key} ({ctx.thresholds.name})
- Response Timescale: {ctx.thresholds.response_timescale}
- Botanical Reference: {ctx.thresholds.source_note}

DETERMINISTIC EVALUATION OUTCOME:
- Rule Engine Severity Level: {rule_level}
- Recommended Action: {action_type}

CRITICAL RULES:
1. You MUST match the severity: set "severity" to exactly "{rule_level}".
2. You MUST only cite real sensor numbers provided above (within +-1). Never invent values.
3. You MUST NOT advise actions that contradict the weather forecast (e.g. do not say "water now" if rain probability >= 50%).
4. Only mention allowed action concepts: 'water', 'wait', 'shade', 'add_light', 'check_device'.
5. Keep explanations warm, concise, and understandable for a beginner.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{{
  "message": "<One or two concise sentences explaining current state and practical advice>",
  "severity": "{rule_level}",
  "reasons": [
    "<Specific bullet point citing actual parameter vs ideal range or weather>"
  ]
}}
"""
