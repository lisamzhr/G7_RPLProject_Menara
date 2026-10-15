"""Main orchestrator coordinating deterministic rules, LLM reasoning, and guardrails."""

import logging

from roofgarden_ai.contracts import Decision, ZoneContext
from roofgarden_ai.guardrails.fallback_templates import generate_fallback_recommendation
from roofgarden_ai.guardrails.validator import validate_and_filter_llm_response
from roofgarden_ai.llm.base import LLMClient, MockLLMClient
from roofgarden_ai.llm.prompts import build_evaluation_prompt
from roofgarden_ai.rule_engine.autonomy import evaluate_action_autonomy
from roofgarden_ai.rule_engine.predictor import LinearSlopePredictor, MoisturePredictor
from roofgarden_ai.rule_engine.status import determine_zone_level, evaluate_parameters

logger = logging.getLogger("roofgarden_ai.orchestrator")


def evaluate(
    ctx: ZoneContext,
    llm_client: LLMClient | None = None,
    predictor: MoisturePredictor | None = None,
) -> Decision:
    """Evaluate plant zone context and return verified Decision."""
    if predictor is None:
        predictor = LinearSlopePredictor()
    if llm_client is None:
        llm_client = MockLLMClient()

    # 1. Deterministic Parameter Classification
    params = evaluate_parameters(ctx)
    rule_level = determine_zone_level(params, ctx)

    # 2. Moisture Depletion Prediction
    est_hours = predictor.predict_hours_to_minimum(ctx)

    # 3. Determine Candidate Action
    candidate_action = "wait"
    if ctx.current_moisture < ctx.thresholds.moisture_min:
        candidate_action = "water"
    elif ctx.current_temp > ctx.thresholds.temp_max:
        candidate_action = "shade"
    elif ctx.current_lux < ctx.thresholds.lux_min:
        candidate_action = "add_light"

    # 4. Strict Autonomy Gate
    action = evaluate_action_autonomy(
        ctx=ctx,
        candidate_action=candidate_action,
        duration_seconds=ctx.suggested_water_seconds,
    )

    # 5. LLM Explanation Generation
    raw_llm_output = None
    used_fallback = False
    recommendation = None

    try:
        prompt = build_evaluation_prompt(
            ctx=ctx,
            params=params,
            rule_level=rule_level,
            action_type=action.action_type,
        )
        raw_llm_output = llm_client.generate(prompt)

        # 6. Guardrail Verification
        rec, err = validate_and_filter_llm_response(raw_llm_output, ctx, rule_level)
        if rec is not None:
            recommendation = rec
        else:
            logger.warning(f"Guardrail triggered fallback for zone '{ctx.zone_id}': {err}")
            used_fallback = True
            recommendation = generate_fallback_recommendation(
                ctx=ctx,
                params=params,
                rule_level=rule_level,
                action_type=action.action_type,
            )
    except Exception as e:
        logger.error(f"Error during LLM generation for zone '{ctx.zone_id}': {e}")
        used_fallback = True
        recommendation = generate_fallback_recommendation(
            ctx=ctx,
            params=params,
            rule_level=rule_level,
            action_type=action.action_type,
        )

    return Decision(
        zone_id=ctx.zone_id,
        overall_level=rule_level,
        recommendation=recommendation,
        action=action,
        estimated_hours_to_min_moisture=est_hours,
        used_fallback=used_fallback,
        raw_llm_output=raw_llm_output,
    )
