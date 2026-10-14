"""Evaluation script for deterministic botanical rules."""

from roofgarden_ai.rule_engine.status import classify_parameter
from roofgarden_ai.rule_engine.thresholds import load_all_profiles


def run_rule_eval():
    profiles = load_all_profiles()
    print(f"Loaded {len(profiles)} botanical profiles for evaluation.")
    for p in profiles.values():
        assert classify_parameter(p.moisture_min + 1, p.moisture_min, p.moisture_max) in ["ok", "near_limit"]
        assert classify_parameter(p.moisture_min - 5, p.moisture_min, p.moisture_max) == "out_of_range"
    print("Rule evaluation completed successfully.")


if __name__ == "__main__":
    run_rule_eval()
