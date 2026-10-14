"""Anthropic Claude LLM client implementation with fallback mock for testing."""

import json
import os

from roofgarden_ai.llm.base import LLMClient


class ClaudeClient(LLMClient):
    """Claude API Client using anthropic SDK."""

    def __init__(self, api_key: str | None = None, model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError("Anthropic API Key is required for ClaudeClient.")
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return self._client

    def generate(self, prompt: str) -> str:
        client = self._get_client()
        response = client.messages.create(
            model=self.model,
            max_tokens=600,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


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

        return json.dumps({
            "message": f"Zone condition is currently {severity}. Moisture and temperature levels are monitored.",
            "severity": severity,
            "reasons": ["Automated mock rule explanation."],
        })
