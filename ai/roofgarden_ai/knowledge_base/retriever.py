"""Knowledge base retriever interface for pgvector."""


from roofgarden_ai.knowledge_base.embedder import BaseEmbedder


class KnowledgeRetriever:
    """Retriever fetching relevant horticultural chunks."""

    def __init__(self, embedder: BaseEmbedder | None = None):
        self.embedder = embedder or BaseEmbedder()

    def retrieve(self, category_key: str, query: str = "") -> list[dict[str, str]]:
        # Retrieval stub querying category-matched chunks
        from roofgarden_ai.knowledge_base.loader import load_profile_chunks
        all_chunks = load_profile_chunks()
        return [c for c in all_chunks if c["category_key"] == category_key]
