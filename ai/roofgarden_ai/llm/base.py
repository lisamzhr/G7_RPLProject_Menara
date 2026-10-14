"""Abstract interface for LLM clients."""

from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Abstract interface isolating LLM provider from business logic."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generate text response from LLM."""
