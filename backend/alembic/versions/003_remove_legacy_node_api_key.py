"""Remove legacy api_key_hash from sensor_nodes for MAC-only authentication.

Revision ID: 003_remove_legacy_node_api_key
Revises: 002_sensor_node_mac_and_name
Create Date: 2026-11-17 15:55:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '003_remove_legacy_node_api_key'
down_revision = '002_sensor_node_mac_and_name'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('sensor_nodes', 'api_key_hash')


def downgrade() -> None:
    op.add_column('sensor_nodes', sa.Column('api_key_hash', sa.String(length=64), nullable=True))
