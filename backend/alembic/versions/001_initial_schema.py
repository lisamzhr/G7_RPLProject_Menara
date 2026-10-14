"""Initial schema migration with TimescaleDB conditional check and aggregation views.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-13 15:30:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='gardener'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. gardens
    op.create_table(
        'gardens',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('elevation_m', sa.Float(), nullable=False, server_default='15.0'),
        sa.Column('adm4_code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. plant_categories
    op.create_table(
        'plant_categories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('response_timescale', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_plant_categories_key', 'plant_categories', ['key'], unique=True)

    # 4. threshold_profiles
    op.create_table(
        'threshold_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('category_id', sa.String(length=36), sa.ForeignKey('plant_categories.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('moisture_min', sa.Float(), nullable=False),
        sa.Column('moisture_max', sa.Float(), nullable=False),
        sa.Column('temp_min', sa.Float(), nullable=False),
        sa.Column('temp_max', sa.Float(), nullable=False),
        sa.Column('humidity_min', sa.Float(), nullable=False),
        sa.Column('humidity_max', sa.Float(), nullable=False),
        sa.Column('lux_min', sa.Float(), nullable=False),
        sa.Column('lux_max', sa.Float(), nullable=False),
        sa.Column('source_note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. plant_zones
    op.create_table(
        'plant_zones',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('garden_id', sa.String(length=36), sa.ForeignKey('gardens.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', sa.String(length=36), sa.ForeignKey('plant_categories.id'), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('plant_names', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 6. sensor_nodes
    op.create_table(
        'sensor_nodes',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('zone_id', sa.String(length=36), sa.ForeignKey('plant_zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('api_key_hash', sa.String(length=64), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 7. sensor_readings
    op.create_table(
        'sensor_readings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('node_id', sa.String(length=50), sa.ForeignKey('sensor_nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), nullable=False),
        sa.Column('soil_moisture_pct', sa.Float(), nullable=False),
        sa.Column('temperature_c', sa.Float(), nullable=False),
        sa.Column('humidity_pct', sa.Float(), nullable=False),
        sa.Column('lux', sa.Float(), nullable=False),
        sa.Column('battery_v', sa.Float(), nullable=True),
        sa.Column('is_valid', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('node_id', 'ts', name='uq_sensor_readings_node_ts')
    )
    op.create_index('idx_sensor_readings_node_ts_desc', 'sensor_readings', ['node_id', sa.text('ts DESC')])

    # 8. actuators
    op.create_table(
        'actuators',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('zone_id', sa.String(length=36), sa.ForeignKey('plant_zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('driver', sa.String(length=50), nullable=False, server_default='relay'),
        sa.Column('max_on_seconds', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('min_interval_minutes', sa.Integer(), nullable=False, server_default='120'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 9. control_actions
    op.create_table(
        'control_actions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('actuator_id', sa.String(length=36), sa.ForeignKey('actuators.id', ondelete='CASCADE'), nullable=False),
        sa.Column('command', sa.String(length=50), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='auto'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 10. recommendations
    op.create_table(
        'recommendations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('zone_id', sa.String(length=36), sa.ForeignKey('plant_zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status_level', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('reasons', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 11. alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('zone_id', sa.String(length=36), sa.ForeignKey('plant_zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('requires_confirmation', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 12. feedback
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.String(length=36), nullable=False),
        sa.Column('decision', sa.String(length=20), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 13. weather_cache
    op.create_table(
        'weather_cache',
        sa.Column('adm4_code', sa.String(length=50), primary_key=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 14. knowledge_chunks
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('category_key', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('source', sa.Text(), nullable=False),
        sa.Column('embedding', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_knowledge_chunks_category_key', 'knowledge_chunks', ['category_key'])

    # Conditional TimescaleDB hypertable conversion (only if on PostgreSQL and TimescaleDB extension exists)
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
                PERFORM create_hypertable('sensor_readings', 'ts', if_not_exists => TRUE);
            END IF;
        END $$;
        """)

        # PostgreSQL views
        op.execute("""
        CREATE OR REPLACE VIEW readings_hourly AS
        SELECT
            node_id,
            date_trunc('hour', ts) AS hour_bucket,
            AVG(soil_moisture_pct) AS avg_moisture,
            MIN(soil_moisture_pct) AS min_moisture,
            MAX(soil_moisture_pct) AS max_moisture,
            AVG(temperature_c) AS avg_temp,
            MIN(temperature_c) AS min_temp,
            MAX(temperature_c) AS max_temp,
            AVG(humidity_pct) AS avg_humidity,
            MIN(humidity_pct) AS min_humidity,
            MAX(humidity_pct) AS max_humidity,
            AVG(lux) AS avg_lux,
            MIN(lux) AS min_lux,
            MAX(lux) AS max_lux,
            COUNT(*) AS sample_count
        FROM sensor_readings
        WHERE is_valid = true
        GROUP BY node_id, date_trunc('hour', ts);
        """)

        op.execute("""
        CREATE OR REPLACE VIEW readings_daily AS
        SELECT
            node_id,
            date_trunc('day', ts) AS day_bucket,
            AVG(soil_moisture_pct) AS avg_moisture,
            MIN(soil_moisture_pct) AS min_moisture,
            MAX(soil_moisture_pct) AS max_moisture,
            AVG(temperature_c) AS avg_temp,
            MIN(temperature_c) AS min_temp,
            MAX(temperature_c) AS max_temp,
            AVG(humidity_pct) AS avg_humidity,
            MIN(humidity_pct) AS min_humidity,
            MAX(humidity_pct) AS max_humidity,
            AVG(lux) AS avg_lux,
            MIN(lux) AS min_lux,
            MAX(lux) AS max_lux,
            COUNT(*) AS sample_count
        FROM sensor_readings
        WHERE is_valid = true
        GROUP BY node_id, date_trunc('day', ts);
        """)
    else:
        # SQLite views
        op.execute("""
        CREATE VIEW IF NOT EXISTS readings_hourly AS
        SELECT
            node_id,
            strftime('%Y-%m-%d %H:00:00', ts) AS hour_bucket,
            AVG(soil_moisture_pct) AS avg_moisture,
            MIN(soil_moisture_pct) AS min_moisture,
            MAX(soil_moisture_pct) AS max_moisture,
            AVG(temperature_c) AS avg_temp,
            MIN(temperature_c) AS min_temp,
            MAX(temperature_c) AS max_temp,
            AVG(humidity_pct) AS avg_humidity,
            MIN(humidity_pct) AS min_humidity,
            MAX(humidity_pct) AS max_humidity,
            AVG(lux) AS avg_lux,
            MIN(lux) AS min_lux,
            MAX(lux) AS max_lux,
            COUNT(*) AS sample_count
        FROM sensor_readings
        WHERE is_valid = 1
        GROUP BY node_id, strftime('%Y-%m-%d %H:00:00', ts);
        """)

        op.execute("""
        CREATE VIEW IF NOT EXISTS readings_daily AS
        SELECT
            node_id,
            strftime('%Y-%m-%d 00:00:00', ts) AS day_bucket,
            AVG(soil_moisture_pct) AS avg_moisture,
            MIN(soil_moisture_pct) AS min_moisture,
            MAX(soil_moisture_pct) AS max_moisture,
            AVG(temperature_c) AS avg_temp,
            MIN(temperature_c) AS min_temp,
            MAX(temperature_c) AS max_temp,
            AVG(humidity_pct) AS avg_humidity,
            MIN(humidity_pct) AS min_humidity,
            MAX(humidity_pct) AS max_humidity,
            AVG(lux) AS avg_lux,
            MIN(lux) AS min_lux,
            MAX(lux) AS max_lux,
            COUNT(*) AS sample_count
        FROM sensor_readings
        WHERE is_valid = 1
        GROUP BY node_id, strftime('%Y-%m-%d 00:00:00', ts);
        """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS readings_daily;")
    op.execute("DROP VIEW IF EXISTS readings_hourly;")
    op.drop_table('knowledge_chunks')
    op.drop_table('weather_cache')
    op.drop_table('feedback')
    op.drop_table('alerts')
    op.drop_table('recommendations')
    op.drop_table('control_actions')
    op.drop_table('actuators')
    op.drop_table('sensor_readings')
    op.drop_table('sensor_nodes')
    op.drop_table('plant_zones')
    op.drop_table('threshold_profiles')
    op.drop_table('plant_categories')
    op.drop_table('gardens')
    op.drop_table('users')
