"""Drop unused knowledge_chunks table.

Revision ID: 004_drop_knowledge_chunks
Revises: 003_remove_legacy_node_api_key
Create Date: 2026-11-26 22:50:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "004_drop_knowledge_chunks"
down_revision = "003_remove_legacy_node_api_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("knowledge_chunks"):
        op.drop_index("ix_knowledge_chunks_category_key", table_name="knowledge_chunks")
        op.drop_table("knowledge_chunks")


def downgrade() -> None:
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("category_key", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_knowledge_chunks_category_key", "knowledge_chunks", ["category_key"])
