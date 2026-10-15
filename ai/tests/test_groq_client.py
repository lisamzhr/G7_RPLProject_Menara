"""Unit tests for GroqClient and LLM integration."""

from unittest.mock import MagicMock, patch
import pytest

from roofgarden_ai.contracts import CategoryThresholds, ZoneContext
from roofgarden_ai.llm.groq_client import GroqClient
from roofgarden_ai.orchestrator import evaluate


def test_groq_client_missing_key_raises_error():
    client = GroqClient(api_key="")
    with pytest.raises(ValueError, match="Groq API Key is required"):
        client.generate("test prompt")


def test_groq_client_mocked_generation():
    client = GroqClient(api_key="gsk_mock_key_test_12345")
    mock_completion = MagicMock()
    mock_completion.choices = [
        MagicMock(
            message=MagicMock(
                content='{"message": "Zone is normal and moist.", "severity": "normal", "reasons": ["Moisture at 75%"]}'
            )
        )
    ]

    with patch("groq.Groq") as mock_groq_class:
        mock_instance = MagicMock()
        mock_instance.chat.completions.create.return_value = mock_completion
        mock_groq_class.return_value = mock_instance

        res = client.generate("Evaluate zone leafy")
        assert "Zone is normal" in res
        assert mock_instance.chat.completions.create.called
        call_kwargs = mock_instance.chat.completions.create.call_args[1]
        assert call_kwargs["response_format"] == {"type": "json_object"}
        assert call_kwargs["model"] == "llama-3.3-70b-versatile"


def test_orchestrator_with_mocked_groq_client():
    thresholds = CategoryThresholds(
        category_key="leafy",
        name="Leafy Vegetables",
        response_timescale="days",
        moisture_min=70.0,
        moisture_max=90.0,
        temp_min=20.0,
        temp_max=30.0,
        humidity_min=50.0,
        humidity_max=85.0,
        lux_min=10000.0,
        lux_max=25000.0,
        source_note="Test botanical reference",
    )
    ctx = ZoneContext(
        zone_id="zone-groq-01",
        zone_label="Groq Test Zone",
        category_key="leafy",
        thresholds=thresholds,
        current_moisture=78.0,
        current_temp=26.0,
        current_humidity=65.0,
        current_lux=18000.0,
        is_reading_valid=True,
    )

    client = GroqClient(api_key="gsk_test")
    valid_groq_json = (
        '{"message": "Kondisi zona pakcoy terpantau normal dan optimal pada kelembapan 78%.", '
        '"severity": "normal", "reasons": ["Kelembapan tanah 78% berada dalam batas ideal 70-90%."]}'
    )

    with patch.object(client, "generate", return_value=valid_groq_json):
        decision = evaluate(ctx, llm_client=client)
        assert decision.overall_level == "normal"
        assert decision.used_fallback is False
        assert "78%" in decision.recommendation.message
