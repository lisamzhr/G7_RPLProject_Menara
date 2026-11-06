"""Add mac_address and name to sensor_nodes, make api_key_hash nullable.

Revision ID: 002_sensor_node_mac_and_name
Revises: 001_initial_schema
Create Date: 2026-11-06 20:25:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '002_sensor_node_mac_and_name'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add mac_address column and unique index
    op.add_column('sensor_nodes', sa.Column('mac_address', sa.String(length=17), nullable=True))
    op.create_index('ix_sensor_nodes_mac_address', 'sensor_nodes', ['mac_address'], unique=True)

    # 2. Add name column
    op.add_column('sensor_nodes', sa.Column('name', sa.String(length=100), nullable=True))

    # 3. Make api_key_hash nullable
    op.alter_column('sensor_nodes', 'api_key_hash', existing_type=sa.String(length=64), nullable=True)


def downgrade() -> None:
    op.alter_column('sensor_nodes', 'api_key_hash', existing_type=sa.String(length=64), nullable=False)
    op.drop_index('ix_sensor_nodes_mac_address', table_name='sensor_nodes')
    op.drop_column('sensor_nodes', 'name')
    op.drop_column('sensor_nodes', 'mac_address')
