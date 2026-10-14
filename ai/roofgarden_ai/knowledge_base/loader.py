"""Knowledge base chunk loader."""

from pathlib import Path

from roofgarden_ai.rule_engine.thresholds import load_all_profiles


def load_profile_chunks(profiles_dir: Path | None = None) -> list[dict[str, str]]:
    """Convert botanical profiles into knowledge base chunks for vector storage."""
    profiles = load_all_profiles(profiles_dir)
    chunks = []
    for key, p in profiles.items():
        text = (
            f"Plant Category: {p.name} ({p.category_key}).\n"
            f"Response Timescale: {p.response_timescale}.\n"
            f"Optimal Soil Moisture: {p.moisture_min}% - {p.moisture_max}%.\n"
            f"Optimal Temperature: {p.temp_min}°C - {p.temp_max}°C.\n"
            f"Optimal Relative Humidity: {p.humidity_min}% - {p.humidity_max}%.\n"
            f"Optimal Solar Illuminance: {p.lux_min} - {p.lux_max} lux.\n"
            f"Horticultural Reference: {p.source_note}"
        )
        chunks.append({
            "category_key": key,
            "content": text,
            "source": p.source_note,
        })
    return chunks
