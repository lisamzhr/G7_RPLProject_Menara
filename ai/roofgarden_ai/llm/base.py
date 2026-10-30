"""Abstract interface for LLM clients."""

from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Abstract interface isolating LLM provider from business logic."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generate text response from LLM."""


class MockLLMClient(LLMClient):
    """Deterministic mock client used for unit tests and local development."""

    def __init__(self, predefined_response: str | None = None):
        self.predefined_response = predefined_response

    def generate(self, prompt: str) -> str:
        if self.predefined_response:
            return self.predefined_response

        # Extract severity and numbers from prompt if present
        severity = "normal"
        if 'Rule Engine Severity Level: warning' in prompt:
            severity = "warning"
        elif 'Rule Engine Severity Level: advisory' in prompt:
            severity = "advisory"

        import json
        return json.dumps({
            "message": f"Zone condition is currently {severity}. Moisture and temperature levels are monitored.",
            "severity": severity,
            "reasons": ["Automated mock rule explanation."],
        })

