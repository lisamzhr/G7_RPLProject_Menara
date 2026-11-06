import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Thermometer,
  Droplet,
  Sun,
  CloudSun,
  CloudRain,
  BatteryFull,
  Wifi,
  Sparkles,
  ArrowRight,
  Sprout,
} from "lucide-react";

import { api } from "../api/client";
import { useGarden } from "../context/GardenContext";
import type {
  ZoneStatus,
  DashboardSummary,
  ParameterMetric,
} from "../types";

import "../styles/dashboard.css";

interface SensorCardData {
  title: string;
  sensor: string;
  value: string;
  unit: string;
  status: string;
  recommendation: string;
  icon: React.ElementType;
  level: number;
  color: string;
}

interface RecommendationData {
  zoneId?: string;
  title: string;
  description: string;
  priority: string;
  type: string;
}

function SensorCard({ sensor }: { sensor: SensorCardData }) {
  const Icon = sensor.icon;

  return (
    <article className="sensor-card">
      <div className="sensor-card-heading">
        <span>{sensor.title}</span>
        <span className="sensor-icon">
          <Icon size={17} />
        </span>
      </div>

      <p className="sensor-name">{sensor.sensor}</p>

      <div className="sensor-value">
        {sensor.value}
        <span>{sensor.unit}</span>
      </div>

      <div className={`sensor-bars ${sensor.color}`}>
        {Array.from({ length: 7 }).map((_, index) => (
          <span
            key={index}
            className={index < sensor.level ? "filled" : ""}
          />
        ))}
      </div>

      <div className="sensor-card-footer">
        <span className={`sensor-status ${sensor.color}`}>
          <span className="status-small-dot" />
          {sensor.status}
        </span>
        <small>{sensor.recommendation}</small>
      </div>
    </article>
  );
}

function WeatherSection({
  weather,
}: {
  weather: DashboardSummary["weather_summary"] | null;
}) {
  const forecast = weather?.forecast || "Weather data unavailable";
  const isRainy =
    forecast.toLowerCase().includes("hujan") ||
    forecast.toLowerCase().includes("rain");

  return (
    <section className="dashboard-panel weather-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="panel-icon weather-icon">
            <CloudSun size={19} />
          </span>
          <h2>BMKG Weather Integration</h2>
        </div>
        <span className="source-tag">{weather?.location || "BMKG"}</span>
      </div>

      <div className="weather-current">
        <div className="weather-current-main">
          {isRainy ? (
            <CloudRain className="weather-main-icon" size={36} />
          ) : (
            <CloudSun className="weather-main-icon" size={36} />
          )}

          <div>
            <strong>{weather ? `${weather.temp_c}°C` : "—"}</strong>
            <span>{forecast}</span>
          </div>
        </div>

        <div className="rain-probability">
          <small>RAIN PROBABILITY</small>
          <strong>{weather ? `${weather.rain_probability_pct}%` : "—"}</strong>
        </div>
      </div>

      <p className="weather-alert">
        {weather
          ? `Microclimate forecast for ${weather.location} based on real-time BMKG meteorological radar.`
          : "Weather data is currently unavailable."}
      </p>

      <div className="weather-footer">
        <span>
          <span className="status-small-dot" />
          {weather ? `Source: ${weather.attribution}` : "Weather unavailable"}
        </span>
      </div>
    </section>
  );
}

function RecommendationsSection({
  recommendations,
  generating,
  generateError,
  generateMessage,
  onGenerate,
}: {
  recommendations: RecommendationData[];
  generating: boolean;
  generateError: string;
  generateMessage: string;
  onGenerate: () => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="dashboard-panel recommendations-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="panel-icon ai-icon">
            <Sparkles size={19} />
          </span>
          <h2>AI Recommendations</h2>
        </div>
        <span className="engine-tag">Agronomy Engine</span>
      </div>

      <div className="generate-rec-container">
        <p>
          Evaluate plant health and receive deterministic care interventions based on live telemetry and BMKG forecasts.
        </p>

        <button
          type="button"
          className="app-btn-primary"
          onClick={onGenerate}
          disabled={generating}
        >
          <Sparkles size={15} />
          {generating ? "Evaluating Microclimates..." : "Run AI Evaluation"}
        </button>

        {generateError && <p className="generate-error">{generateError}</p>}
        {generateMessage && <p className="generate-success">{generateMessage}</p>}
      </div>

      <div className="recommendation-list">
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <article className="recommendation-card" key={`${item.title}-${index}`}>
              <div className="recommendation-top">
                <h3>
                  <Sparkles size={15} />
                  {item.title}
                </h3>
                <span className={`priority-tag ${item.type}`}>
                  {item.priority}
                </span>
              </div>

              <p>{item.description}</p>

              <div className="recommendation-bottom">
                <small>Intervention Advisory</small>
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => navigate("/recommendations")}
                  style={{ padding: "5px 12px", fontSize: "11.5px" }}
                >
                  View Details
                  <ArrowRight size={13} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <p style={{ color: "#64748b", padding: "16px 0" }}>
            No recommendations generated yet. Click "Run AI Evaluation" above to compute suggestions.
          </p>
        )}
      </div>

      <div className="recommendation-footer">
        <span>Based on latest zone readings</span>
        <Link to="/recommendations" style={{ color: "#203c28", fontWeight: 600 }}>
          Manage all recommendations &rarr;
        </Link>
      </div>
    </section>
  );
}

function getMetric(
  parameterStatus: Record<string, ParameterMetric>,
  possibleKeys: string[],
): ParameterMetric | undefined {
  const normalizedEntries = Object.entries(parameterStatus).map(
    ([key, value]) => [key.toLowerCase(), value] as const,
  );

  return normalizedEntries.find(([key]) =>
    possibleKeys.some((possibleKey) => key === possibleKey.toLowerCase()),
  )?.[1];
}

function formatSensorValue(value: number | undefined, decimals = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return Number(value.toFixed(decimals)).toLocaleString("en-US");
}

function getSensorStatus(metric?: ParameterMetric): string {
  if (!metric) return "No data";
  if (metric.status === "ok") return "Optimal";
  if (metric.status === "low") return "Below Ideal";
  if (metric.status === "high") return "Above Ideal";
  return metric.status;
}

function getSensorColor(metric?: ParameterMetric): string {
  if (!metric) return "gold";
  if (metric.status === "ok") return "green";
  return "gold";
}

function getSensorLevel(metric?: ParameterMetric): number {
  if (!metric) return 0;
  const { value, ideal_min, ideal_max } = metric;
  if (ideal_max <= ideal_min) return 3;
  const ratio = (value - ideal_min) / (ideal_max - ideal_min);
  return Math.max(1, Math.min(7, Math.round(ratio * 6) + 1));
}

function buildSensorData(zoneStatus: ZoneStatus | null): SensorCardData[] {
  const reading = zoneStatus?.latest_reading;
  const parameters = (zoneStatus?.parameter_status || {}) as Record<
    string,
    ParameterMetric
  >;

  const temperatureMetric = getMetric(parameters, [
    "temperature",
    "temperature_c",
    "air_temperature",
  ]);

  const humidityMetric = getMetric(parameters, [
    "humidity",
    "humidity_pct",
    "air_humidity",
  ]);

  const soilMetric = getMetric(parameters, [
    "soil_moisture",
    "soil_moisture_pct",
    "moisture",
  ]);

  const lightMetric = getMetric(parameters, [
    "light",
    "lux",
    "light_intensity",
  ]);

  const getValue = (
    readingValue: number | undefined,
    metric?: ParameterMetric,
  ) => readingValue ?? metric?.value;

  return [
    {
      title: "AIR TEMPERATURE",
      sensor: "DHT22 Sensor",
      value: formatSensorValue(
        getValue(reading?.temperature_c, temperatureMetric),
      ),
      unit: "°C",
      status: getSensorStatus(temperatureMetric),
      recommendation: temperatureMetric
        ? `Ideal: ${temperatureMetric.ideal_min}–${temperatureMetric.ideal_max}°C`
        : "No parameter data",
      icon: Thermometer,
      level: getSensorLevel(temperatureMetric),
      color: getSensorColor(temperatureMetric),
    },
    {
      title: "AIR HUMIDITY",
      sensor: "DHT22 Sensor",
      value: formatSensorValue(
        getValue(reading?.humidity_pct, humidityMetric),
      ),
      unit: "%",
      status: getSensorStatus(humidityMetric),
      recommendation: humidityMetric
        ? `Ideal: ${humidityMetric.ideal_min}–${humidityMetric.ideal_max}%`
        : "No parameter data",
      icon: Droplet,
      level: getSensorLevel(humidityMetric),
      color: getSensorColor(humidityMetric),
    },
    {
      title: "SOIL MOISTURE",
      sensor: "Capacitive v1.2",
      value: formatSensorValue(
        getValue(reading?.soil_moisture_pct, soilMetric),
        0,
      ),
      unit: "%",
      status: getSensorStatus(soilMetric),
      recommendation: soilMetric
        ? `Ideal: ${soilMetric.ideal_min}–${soilMetric.ideal_max}%`
        : "No parameter data",
      icon: Sprout,
      level: getSensorLevel(soilMetric),
      color: getSensorColor(soilMetric),
    },
    {
      title: "LIGHT INTENSITY",
      sensor: "BH1750 Lux Sensor",
      value: formatSensorValue(getValue(reading?.lux, lightMetric), 0),
      unit: "lux",
      status: getSensorStatus(lightMetric),
      recommendation: lightMetric
        ? `Ideal: ${lightMetric.ideal_min}–${lightMetric.ideal_max} lux`
        : "No parameter data",
      icon: Sun,
      level: getSensorLevel(lightMetric),
      color: getSensorColor(lightMetric),
    },
  ];
}

function buildRecommendations(
  summary: DashboardSummary | null,
  zoneStatuses: ZoneStatus[],
): RecommendationData[] {
  if (summary?.top_recommendations?.length) {
    return summary.top_recommendations.map((item) => {
      const isHigh = item.status_level === "warning";
      const isMedium = item.status_level === "advisory";

      return {
        zoneId: item.zone_id,
        title: item.zone_label,
        description: item.message,
        priority: isHigh
          ? "High Priority"
          : isMedium
            ? "Medium Priority"
            : "Normal",
        type: isHigh ? "high" : isMedium ? "medium" : "low",
      };
    });
  }

  return zoneStatuses
    .filter((zone) => zone.latest_recommendation)
    .map((zone) => {
      const recommendation = zone.latest_recommendation!;
      const isHigh = recommendation.status_level === "warning";
      const isMedium = recommendation.status_level === "advisory";

      return {
        zoneId: zone.zone_id,
        title: zone.zone_label,
        description: recommendation.message,
        priority: isHigh
          ? "High Priority"
          : isMedium
            ? "Medium Priority"
            : "Normal",
        type: isHigh ? "high" : isMedium ? "medium" : "low",
      };
    });
}

export const Dashboard: React.FC = () => {
  const { selectedGarden, zones, selectedZone, setSelectedZone } = useGarden();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeZoneStatus, setActiveZoneStatus] = useState<ZoneStatus | null>(null);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generateMessage, setGenerateMessage] = useState("");

  const loadDashboardData = useCallback(async () => {
    if (!selectedGarden) {
      setSummary(null);
      setActiveZoneStatus(null);
      setZoneStatuses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const summaryData = await api.getDashboardSummary(selectedGarden.id);
      setSummary(summaryData);

      if (zones.length > 0) {
        const statuses = await Promise.all(
          zones.map((z) => api.getZoneStatus(z.id))
        );
        setZoneStatuses(statuses);

        const targetZone = selectedZone || zones[0];
        const currentStatus = statuses.find((s) => s.zone_id === targetZone.id) || statuses[0];
        setActiveZoneStatus(currentStatus);
      } else {
        setActiveZoneStatus(null);
        setZoneStatuses([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [selectedGarden, zones, selectedZone]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGenerateRecommendations = async () => {
    if (!zones.length) {
      setGenerateError("No plant zones configured in this garden yet.");
      return;
    }

    try {
      setGenerating(true);
      setGenerateError("");
      setGenerateMessage("");

      const results = await Promise.allSettled(zones.map((z) => api.evaluateZone(z.id)));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const cooldownCount = results.filter(
        (r) => r.status === "rejected" && r.reason?.message?.includes("429")
      ).length;

      if (succeeded > 0) {
        setGenerateMessage(`AI evaluation completed for ${succeeded} zone(s).`);
      } else if (cooldownCount > 0) {
        setGenerateMessage("Zones were evaluated recently (cooldown active: 1 min between runs).");
      }

      await loadDashboardData();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to run AI evaluation.");
    } finally {
      setGenerating(false);
    }
  };

  const sensorData = buildSensorData(activeZoneStatus);
  const recommendations = buildRecommendations(summary, zoneStatuses);

  const displayZoneLabel = activeZoneStatus?.zone_label || selectedZone?.label || "Primary Zone";

  return (
    <div>
      {/* PAGE HEADING */}
      <div className="page-header">
        <div>
          <h1>Dashboard Overview {loading && <small style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>(Syncing...)</small>}</h1>
          <p>
            Real-time microclimate conditions and AI-synthesized botanical health for {selectedGarden?.name || "your rooftop garden"}.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* COMPACT HEALTH & FACILITY OVERVIEW STRIP */}
      <section className="garden-overview" style={{ marginBottom: "24px" }}>
        <div className="garden-overview-info">
          <span className="overview-icon">
            <Sprout size={20} />
          </span>
          <div>
            <strong>{selectedGarden?.name || "Rooftop Garden"}</strong>
            <small>{selectedGarden?.location_name || "Location"}</small>
          </div>
        </div>

        <div className="garden-condition">
          <span>&bull; {summary?.zones_ok ?? 0} Optimal Zones</span>
          <span style={{ color: (summary?.zones_need_attention ?? 0) > 0 ? "#b45309" : undefined }}>
            &bull; {summary?.zones_need_attention ?? 0} Attention Needed
          </span>
        </div>

        <div className="overview-divider" />

        <div className="sensor-connection">
          <strong>
            <span className="status-small-dot" />
            {summary?.total_zones ?? zones.length} Monitored Zones
          </strong>
          <small>
            {summary?.active_alerts_count ?? 0} Active Alerts
          </small>
        </div>

        <div className="hardware-status">
          <span>
            <BatteryFull size={15} />
            Battery: {activeZoneStatus?.latest_reading?.battery_v != null ? `${activeZoneStatus.latest_reading.battery_v}V` : "Normal"}
          </span>
          <span>
            <Wifi size={15} />
            Node: {activeZoneStatus?.latest_reading ? "Online" : "Awaiting data"}
          </span>
        </div>
      </section>

      {/* ZONE PICKER CHIPS */}
      {zones.length > 1 && (
        <div className="zone-chips">
          <span style={{ fontSize: "12px", color: "#64748b", marginRight: "4px" }}>Viewing Zone:</span>
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`zone-chip ${activeZoneStatus?.zone_id === z.id ? "active" : ""}`}
              onClick={() => {
                setSelectedZone(z);
                const s = zoneStatuses.find((item) => item.zone_id === z.id);
                if (s) setActiveZoneStatus(s);
              }}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}

      {/* 4 LIVE SENSOR CARDS */}
      <div style={{ marginBottom: "8px", fontSize: "12px", color: "#64748b" }}>
        Live Sensor Readings for <strong>{displayZoneLabel}</strong>:
      </div>
      <section className="sensor-grid" style={{ marginBottom: "28px" }}>
        {sensorData.map((sensor) => (
          <SensorCard key={sensor.title} sensor={sensor} />
        ))}
      </section>

      {/* WEATHER AND RECOMMENDATIONS */}
      <WeatherSection weather={summary?.weather_summary || null} />

      <RecommendationsSection
        recommendations={recommendations}
        generating={generating}
        generateError={generateError}
        generateMessage={generateMessage}
        onGenerate={handleGenerateRecommendations}
      />
    </div>
  );
};

export default Dashboard;
