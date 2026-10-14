"""RoofGarden AI - Agentic botanical evaluation and safety guardrails."""

from roofgarden_ai.contracts import (
    CategoryThresholds,
    Decision,
    ParameterReading,
    ProposedAction,
    Recommendation,
    ZoneContext,
)
from roofgarden_ai.orchestrator import evaluate

__all__ = [
    "CategoryThresholds",
    "Decision",
    "ParameterReading",
    "ProposedAction",
    "Recommendation",
    "ZoneContext",
    "evaluate",
]
