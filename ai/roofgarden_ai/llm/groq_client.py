"""Groq LLM client implementation using groq SDK (Fast and Free Llama-3 models)."""

import json
import os
import logging
from roofgarden_ai.llm.base import LLMClient

logger = logging.getLogger("roofgarden_ai.llm.groq")


class GroqClient(LLMClient):
    """Groq API Client providing ultra-fast inference on open models."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "llama-3.3-70b-versatile",
    ):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError("Groq API Key is required for GroqClient. Set GROQ_API_KEY environment variable or pass api_key.")
            import groq
            self._client = groq.Groq(api_key=self.api_key)
        return self._client

    def generate(self, prompt: str) -> str:
        """Generate response from Groq using json_object format enforcement."""
        client = self._get_client()
        try:
            response = client.chat.completions.create(
                model=self.model,
                max_tokens=600,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You are a botanical assistant for an urban roof garden. You must always return only a valid JSON object matching the exact schema requested by the user, without any markdown formatting or extra text.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = response.choices[0].message.content or ""
            return content.strip()
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
