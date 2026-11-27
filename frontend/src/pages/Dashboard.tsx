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
  Leaf,
  MapPin,
  Activity,
  AlertCircle,
  Building2,
  ChevronDown,
  RefreshCw,
  Plus,
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
    <article className={`dash-sensor-card ${sensor.color}`}>
      <div className="dash-sensor-top">
        <div className="dash-sensor-icon">
          <Icon size={19} />
        </div>
        <span className={`dash-sensor-state ${sensor.color}`}>
          <span className="dash-status-dot" />
          {sensor.status}
        </span>
      </div>

      <span className="dash-sensor-title">{sensor.title}</span>
      <span className="dash-sensor-name">{sensor.sensor}</span>

      <div className="dash-sensor-value">
        {sensor.value}
        <span>{sensor.unit}</span>
      </div>

      <div className="dash-sensor-bars">
        {Array.from({ length: 7 }).map((_, index) => (
          <span
            key={index}
            className={index < sensor.level ? "filled" : ""}
          />
        ))}
      </div>

      <div className="dash-sensor-bottom">
        <span className="dash-sensor-ideal">
          {sensor.recommendation}
        </span>
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
    <section className="dash-feature-panel dash-weather-panel">
      <div className="dash-feature-heading">
        <div className="dash-section-icon weather">
          <CloudSun size={20} />
        </div>

        <div>
          <span className="dash-eyebrow">WEATHER INTELLIGENCE</span>
          <h2>Weather Outlook</h2>
        </div>
      </div>

      <div className="dash-weather-main">
        <div className="dash-weather-condition">
          {weather?.icon_url ? (
            <img
              src={weather.icon_url}
              alt={forecast}
              className="dash-weather-image"
            />
          ) : isRainy ? (
            <CloudRain size={45} className="dash-weather-image" />
          ) : (
            <CloudSun size={45} className="dash-weather-image" />
          )}

          <div>
            <strong>{weather ? `${weather.temp_c}°` : "—"}</strong>
            <span>{forecast}</span>
          </div>
        </div>

        <div className="dash-rain-stat">
          <span>Rain probability</span>
          <strong>
            {weather ? `${weather.rain_probability_pct}%` : "—"}
          </strong>
        </div>
      </div>

      <div className="dash-weather-details">
        {weather?.humidity_pct !== undefined && (
          <div className="dash-weather-detail">
            <Droplet size={15} />
            <span>Humidity</span>
            <strong>{weather.humidity_pct}%</strong>
          </div>
        )}

        {weather?.wind_speed_kmh !== undefined && (
          <div className="dash-weather-detail">
            <Activity size={15} />
            <span>Wind</span>
            <strong>{weather.wind_speed_kmh} km/h</strong>
          </div>
        )}
      </div>

      <p className="dash-weather-description">
        {weather
          ? `Weather conditions around ${weather.location} are integrated into MENARA's environmental insights.`
          : "Weather data is currently unavailable."}
      </p>

      <div className="dash-weather-source">
        <span className="dash-status-dot" />
        {weather ? `Source: ${weather.attribution}` : "Weather unavailable"}
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
    <section className="dash-feature-panel dash-ai-panel">
      <div className="dash-feature-heading">
        <div className="dash-section-icon ai">
          <Sparkles size={20} />
        </div>

        <div>
          <span className="dash-eyebrow">SMART CARE SYSTEM</span>
          <h2>AI Plant Insights</h2>
        </div>
      </div>

      <div className="dash-ai-intro">
        <p>
          Evaluate plant conditions using live telemetry and
          weather insights to generate care interventions.
        </p>
      </div>

      <button
        type="button"
        className="dash-ai-generate"
        onClick={onGenerate}
        disabled={generating}
      >
        <Sparkles size={16} />
        {generating
          ? "Evaluating Microclimates..."
          : "Run AI Evaluation"}
        <ArrowRight size={16} />
      </button>

      {generateError && (
        <p className="dash-feedback error">{generateError}</p>
      )}

      {generateMessage && (
        <p className="dash-feedback success">{generateMessage}</p>
      )}

      <div className="dash-rec-list">
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <article
              className="dash-rec-card"
              key={`${item.title}-${index}`}
            >
              <div className="dash-rec-card-top">
                <h3>
                  <Leaf size={15} />
                  {item.title}
                </h3>

                <span className={`dash-priority ${item.type}`}>
                  {item.priority}
                </span>
              </div>

              <p>{item.description}</p>

              <button
                type="button"
                className="dash-rec-link"
                onClick={() => navigate("/recommendations")}
              >
                View recommendation
                <ArrowRight size={14} />
              </button>
            </article>
          ))
        ) : (
          <div className="dash-rec-empty">
            <Sparkles size={20} />
            <p>
              No recommendations yet. Run an AI evaluation
              to generate plant care insights.
            </p>
          </div>
        )}
      </div>

      <Link
        to="/recommendations"
        className="dash-all-recommendations"
      >
        View all recommendations
        <ArrowRight size={15} />
      </Link>
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
    possibleKeys.some(
      (possibleKey) => key === possibleKey.toLowerCase(),
    ),
  )?.[1];
}

function formatSensorValue(
  value: number | undefined,
  decimals = 1,
): string {
  if (
    value === undefined ||
    value === null ||
    Number.isNaN(value)
  ) {
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

function buildSensorData(
  zoneStatus: ZoneStatus | null,
): SensorCardData[] {
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
      value: formatSensorValue(
        getValue(reading?.lux, lightMetric),
        0,
      ),
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
  const {
    gardens,
    selectedGarden,
    setSelectedGarden,
    zones,
    selectedZone,
    setSelectedZone,
  } = useGarden();

  const [showGardenMenu, setShowGardenMenu] = useState(false);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [activeZoneStatus, setActiveZoneStatus] =
    useState<ZoneStatus | null>(null);

  const [zoneStatuses, setZoneStatuses] =
    useState<ZoneStatus[]>([]);

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

      const summaryData = await api.getDashboardSummary(
        selectedGarden.id,
      );

      setSummary(summaryData);

      if (zones.length > 0) {
        const statuses = await Promise.all(
          zones.map((z) => api.getZoneStatus(z.id)),
        );

        setZoneStatuses(statuses);

        const targetZone = selectedZone || zones[0];

        const currentStatus =
          statuses.find(
            (s) => s.zone_id === targetZone.id,
          ) || statuses[0];

        setActiveZoneStatus(currentStatus);
      } else {
        setActiveZoneStatus(null);
        setZoneStatuses([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard metrics.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedGarden, zones, selectedZone]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGenerateRecommendations = async () => {
    if (!zones.length) {
      setGenerateError(
        "No plant zones configured in this garden yet.",
      );
      return;
    }

    try {
      setGenerating(true);
      setGenerateError("");
      setGenerateMessage("");

      const results = await Promise.allSettled(
        zones.map((z) => api.evaluateZone(z.id)),
      );

      const succeeded = results.filter(
        (r) => r.status === "fulfilled",
      ).length;

      const cooldownCount = results.filter(
        (r) =>
          r.status === "rejected" &&
          r.reason?.message?.includes("429"),
      ).length;

      if (succeeded > 0) {
        setGenerateMessage(
          `AI evaluation completed for ${succeeded} zone(s).`,
        );
      } else if (cooldownCount > 0) {
        setGenerateMessage(
          "Zones were evaluated recently (cooldown active: 1 min between runs).",
        );
      }

      await loadDashboardData();
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : "Failed to run AI evaluation.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const sensorData = buildSensorData(activeZoneStatus);

  const recommendations = buildRecommendations(
    summary,
    zoneStatuses,
  );

  const displayZoneLabel =
    activeZoneStatus?.zone_label ||
    selectedZone?.label ||
    "Primary Zone";

  return (
    <div className="menara-dashboard">
{/* DASHBOARD HERO */}

<section className="dash-hero">

  {/* HERO TOP ROW */}
  <div className="dash-hero-top">

    <div className="dash-hero-overview-title">
      Dashboard Overview
    </div>

    {/* HERO CONTROLS */}
    <div className="dash-hero-controls">
      <div className={`dash-hero-sync ${loading ? "loading" : ""}`}>
        <RefreshCw
          size={14}
          className={loading ? "animate-spin" : ""}
        />
        <span>{loading ? "Syncing..." : "Connected"}</span>
      </div>

      <div className="dash-hero-garden-selector">
        <button
          type="button"
          className="dash-hero-garden-button"
          onClick={() => setShowGardenMenu((prev) => !prev)}
          aria-expanded={showGardenMenu}
        >
          <Building2 size={18} />

          <div className="dash-hero-garden-info">
            <strong>
              {selectedGarden?.name || "Select Garden"}
            </strong>

            <small>
              {selectedGarden?.location_name || "Garden location"}
            </small>
          </div>

          <ChevronDown
            size={16}
            className={showGardenMenu ? "rotated" : ""}
          />
        </button>

        {showGardenMenu && (
          <div className="dash-hero-garden-dropdown">
            <div className="dash-hero-dropdown-label">
              SWITCH GARDEN FACILITY
            </div>

            {gardens.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`dash-hero-garden-option ${
                  g.id === selectedGarden?.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedGarden(g);
                  setShowGardenMenu(false);
                }}
              >
                <strong>{g.name}</strong>

                <small>
                  {g.location_name} • {g.elevation_m}m
                </small>
              </button>
            ))}

            {gardens.length === 0 && (
              <div className="dash-hero-garden-empty">
                No gardens found.
              </div>
            )}

            <div className="dash-hero-dropdown-bottom">
              <Link
                to="/garden-profile"
                onClick={() => setShowGardenMenu(false)}
              >
                <Plus size={15} />
                Add New Garden Facility
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>

  </div>

  {/* HERO CONTENT */}
  <div className="dash-hero-content">

    <h1>
      Your garden, <span>in balance.</span>
    </h1>

    <p>
      Monitor your rooftop ecosystem and discover
      insights to help your plants thrive.
    </p>

    <div className="dash-hero-meta">
      <MapPin size={15} />

      <span>
        {selectedGarden?.location_name ||
          selectedGarden?.name ||
          "Rooftop Garden"}
      </span>
    </div>

  </div>

</section>


{/* ERROR */}

{error && (
  <div className="dash-error-banner">
    <AlertCircle size={16} />
    {error}
  </div>
)}

{/* GARDEN OVERVIEW */}

<section className="dash-overview">
  <div className="dash-overview-heading">
    <div>
      <span className="dash-eyebrow">
        GARDEN OVERVIEW
      </span>

      <h2>Garden health</h2>
    </div>

    <div className="dash-overview-garden">
      <Sprout size={17} />

      <span>
        {selectedGarden?.name || "Rooftop Garden"}
      </span>
    </div>
  </div>

  <div className="dash-overview-grid">
    <div className="dash-overview-stat">
      <div className="dash-stat-icon green">
        <Sprout size={18} />
      </div>

      <div className="dash-stat-copy">
        <small>Zones in optimal condition</small>
        <strong>{summary?.zones_ok ?? 0}</strong>
        <span>Healthy zones</span>
      </div>
    </div>

    <div className="dash-overview-stat">
      <div className="dash-stat-icon gold">
        <AlertCircle size={18} />
      </div>

      <div className="dash-stat-copy">
        <small>Zones needing attention</small>

        <strong>
          {summary?.zones_need_attention ?? 0}
        </strong>

        <span>Requires monitoring</span>
      </div>
    </div>

    <div className="dash-overview-stat">
      <div className="dash-stat-icon sage">
        <Activity size={18} />
      </div>

      <div className="dash-stat-copy">
        <small>Monitored zones</small>

        <strong>
          {summary?.total_zones ?? zones.length}
        </strong>

        <span>Registered plant zones</span>
      </div>
    </div>

    <div className="dash-overview-stat">
      <div className="dash-stat-icon alert">
        <AlertCircle size={18} />
      </div>

      <div className="dash-stat-copy">
        <small>Active alerts</small>

        <strong>
          {summary?.active_alerts_count ?? 0}
        </strong>

        <span>Current notifications</span>
      </div>
    </div>
  </div>

  <div className="dash-hardware-row">
    <div className="dash-hardware-item">
      <BatteryFull size={16} />
      <span>Battery</span>

      <strong>
        {activeZoneStatus?.latest_reading?.battery_v != null
          ? `${activeZoneStatus.latest_reading.battery_v}V`
          : "Normal"}
      </strong>
    </div>

    <div className="dash-hardware-item">
      <Wifi size={16} />
      <span>Sensor node</span>

      <strong>
        {activeZoneStatus?.latest_reading
          ? "Online"
          : "Awaiting data"}
      </strong>
    </div>
  </div>
</section>

{/* MONITORING LAYOUT */}

<div className="dash-monitoring-layout">

  {/* TOP: MONITORING AREA */}

  {zones.length > 1 && (
    <section className="dash-zone-section">

      <div className="dash-zone-heading">
        <h2>Choose your zone</h2>
      </div>

      <div className="dash-zone-list">
        {zones.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`dash-zone-pill ${
              activeZoneStatus?.zone_id === z.id
                ? "active"
                : ""
            }`}
            onClick={() => {
              setSelectedZone(z);

              const s = zoneStatuses.find(
                (item) => item.zone_id === z.id,
              );

              if (s) setActiveZoneStatus(s);
            }}
          >
            <Sprout size={14} />
            {z.label}
          </button>
        ))}
      </div>

    </section>
  )}

 {/* BOTTOM: SENSOR MONITORING */}

<section className="dash-sensor-section">
  <div className="dash-section-heading">
    <div className="dash-sensor-heading-content">
      <div className="dash-sensor-title-row">
        <h2>Live sensor readings</h2>

        <p>
          Real-time conditions for{" "}
          <strong>{displayZoneLabel}</strong>
        </p>
      </div>
    </div>
  </div>

  <div className="dash-sensor-grid">
    {sensorData.map((sensor) => (
      <SensorCard
        key={sensor.title}
        sensor={sensor}
      />
    ))}
  </div>
</section>

</div>
        {/* WEATHER & AI */}

        <div className="dash-bottom-grid">
          {/* LEFT: AI PLANT INSIGHTS */}
          <RecommendationsSection
            recommendations={recommendations}
            generating={generating}
            generateError={generateError}
            generateMessage={generateMessage}
            onGenerate={handleGenerateRecommendations}
          />

          {/* RIGHT: WEATHER OUTLOOK */}
          <WeatherSection
            weather={summary?.weather_summary || null}
          />
        </div>

        {/* FOOTER */}
        <footer className="app-footer">
          <span>
             &copy; 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
          </span>
        </footer>
    </div>
  );
};

export default Dashboard;
