"""Embedding provider interface."""



class BaseEmbedder:
    """Embedder generating 1536-dimensional vectors for pgvector."""

    def embed_text(self, text: str) -> list[float]:
        # Simple deterministic vector generator stub for testing/MVP
        # In production with OpenAI/Voyage/Cohere, replace with API call
        import hashlib
        h = hashlib.sha256(text.encode("utf-8")).digest()
        # Produce 1536 pseudo-random deterministic floats
        vec = [((b / 255.0) * 2.0 - 1.0) for b in (h * 48)[:1536]]
        return vec
