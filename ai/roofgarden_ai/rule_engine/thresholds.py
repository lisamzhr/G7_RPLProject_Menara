"""Threshold loader and botanical constants."""

import json
from pathlib import Path

from roofgarden_ai.contracts import CategoryThresholds


def load_category_profile(category_key: str, profiles_dir: Path | None = None) -> CategoryThresholds:
    """Load category profile JSON from disk."""
    if profiles_dir is None:
        profiles_dir = Path(__file__).resolve().parent.parent.parent / "data" / "profiles"

    profile_path = profiles_dir / f"{category_key}.json"
    if not profile_path.exists():
        raise FileNotFoundError(f"Threshold profile not found for category '{category_key}' at {profile_path}")

    with open(profile_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return CategoryThresholds(**data)


def load_all_profiles(profiles_dir: Path | None = None) -> dict[str, CategoryThresholds]:
    """Load all standard botanical category profiles."""
    keys = ["leafy", "fruiting_veg", "herbs", "fruit_potted"]
    return {k: load_category_profile(k, profiles_dir) for k in keys}
