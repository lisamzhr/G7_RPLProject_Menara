import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Sprout,
  LayoutDashboard,
  BarChart3,
  Brain,
  SlidersHorizontal,
  Settings,
  Thermometer,
  Droplet,
  Sun,
  CloudSun,
  CloudRain,
  Cloud,
  Wifi,
  BatteryFull,
  ChevronDown,
  MapPin,
  Radio,
  Sparkles,
  House,
  UserRound,
  LogOut,
  Check,
} from "lucide-react";

import { api } from "../api/client";
import type {
  Garden,
  PlantZone,
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
  title: string;
  description: string;
  priority: string;
  type: string;
}

const sidebarLinks = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", active: true },
  { label: "Garden Profile", icon: Sprout, to: "/garden-profile" },
  {
    label: "Environmental Monitoring",
    icon: BarChart3,
    to: "/monitoring",
  },
  { label: "AI Recommendations", icon: Brain, to: "/recommendations", ai: true },
  { label: "Device Control", icon: SlidersHorizontal, to: "/devices" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

function Sidebar() {
  const navigate = useNavigate();

  const storedUser =
    localStorage.getItem("roofgarden_user") ||
    sessionStorage.getItem("roofgarden_user");

  let userName = "Gardener";
  let userRole = "Gardener";

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      userName = user.name || "Gardener";
      userRole = user.role || "Gardener";
    } catch {
      // Use fallback profile
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("roofgarden_token");
    sessionStorage.removeItem("roofgarden_token");
    localStorage.removeItem("roofgarden_user");
    sessionStorage.removeItem("roofgarden_user");
    localStorage.removeItem("roofgarden_email");

    navigate("/login", { replace: true });
  };

  return (
    <aside className="dashboard-sidebar">
      <Link to="/dashboard" className="dashboard-brand">
        <span className="dashboard-brand-logo">
          <img src="/LogoMenara.png" alt="MENARA Logo" />
        </span>

        <span className="dashboard-brand-text">
          <strong>
            MENARA<span className="brand-online-dot" />
          </strong>
          <small>ROOFTOP AGRITECH</small>
        </span>
      </Link>

      <nav className="dashboard-navigation">
        {sidebarLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              to={item.to}
              key={item.label}
              className={`dashboard-nav-link ${
                item.active ? "active" : ""
              }`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.ai && <span className="nav-ai-tag">AI</span>}
              {item.active && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="network-status">
          <span className="network-dot" />
          <span>Online • Node Mesh</span>
          <Radio size={13} />
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            <UserRound size={19} />
          </div>

          <div className="profile-info">
            <strong title={userName}>{userName}</strong>
            <small>{userRole}</small>
          </div>

          <button
            className="profile-menu"
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
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
  const isRainy = forecast.toLowerCase().includes("hujan") ||
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
        <span className="source-tag">
          {weather?.location || "BMKG"}
        </span>
      </div>

      <div className="weather-current">
        <div className="weather-current-main">
          {isRainy ? (
            <CloudRain className="weather-main-icon" size={34} />
          ) : (
            <CloudSun className="weather-main-icon" size={34} />
          )}

          <div>
            <strong>
              {weather ? `${weather.temp_c}°C` : "—"}
            </strong>
            <span>{forecast}</span>
          </div>
        </div>

        <div className="rain-probability">
          <small>RAIN PROB.</small>
          <strong>
            {weather ? `${weather.rain_probability_pct}%` : "—"}
          </strong>
        </div>
      </div>

      <p className="weather-alert">
        {weather
          ? `Weather information for ${weather.location} based on BMKG forecast data.`
          : "Weather information is currently unavailable."}
      </p>

      <div className="weather-forecast">
        <div className="forecast-item">
          <small>Forecast</small>
          <Sun size={17} className="sunny-icon" />
          <strong>{weather ? `${weather.temp_c}°C` : "—"}</strong>
          <span>{forecast}</span>
        </div>

        <div className="forecast-item active">
          <small>Rain Probability</small>
          <CloudRain size={17} />
          <strong>
            {weather ? `${weather.rain_probability_pct}%` : "—"}
          </strong>
          <span>BMKG Data</span>
        </div>

        <div className="forecast-item">
          <small>Hourly Forecast</small>
          <Cloud size={17} />
          <strong>—</strong>
          <span>Not available</span>
        </div>
      </div>

      <div className="weather-footer">
        <span>
          <span className="status-small-dot" />
          {weather
            ? `Source: ${weather.attribution}`
            : "Weather data unavailable"}
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
          Generate personalized recommendations based on your
          latest environmental sensor readings.
        </p>

        <button
          type="button"
          className="recommendation-action generate-button"
          onClick={onGenerate}
          disabled={generating}
        >
          <Sparkles size={15} />
          {generating ? "Generating..." : "Generate AI Recommendations"}
        </button>

        {generateError && (
          <p className="generate-error">{generateError}</p>
        )}

        {generateMessage && (
          <p className="generate-success">{generateMessage}</p>
        )}
      </div>

      <div className="recommendation-list">
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <article
              className="recommendation-card"
              key={`${item.title}-${index}`}
            >
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
                <small>MENARA Recommendation</small>
                <span className="recommendation-action">
                  View
                  <Check size={12} />
                </span>
              </div>
            </article>
          ))
        ) : (
          <p>No recommendations available at the moment.</p>
        )}
      </div>

      <div className="recommendation-footer">
        <span>Based on latest zone status</span>
        <strong>{recommendations.length} Recommendations</strong>
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
  if (metric.status === "low" || metric.status === "high") return "gold";

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
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [showGardenMenu, setShowGardenMenu] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Recommendation states
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generateMessage, setGenerateMessage] = useState("");

  const loadGardenData = async (targetGarden: Garden) => {
    try {
      setLoading(true);
      setError("");
      setGarden(targetGarden);

      const [summaryData, zonesData] = await Promise.all([
        api.getDashboardSummary(targetGarden.id),
        api.getZones(targetGarden.id),
      ]);

      setSummary(summaryData);
      setZones(zonesData);

      const statuses = await Promise.all(
        zonesData.map((zone) => api.getZoneStatus(zone.id)),
      );
      setZoneStatuses(statuses);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load garden data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const gardensData = await api.getGardens();
        if (!isMounted) return;

        setGardens(gardensData);

        const initialGarden = gardensData[0] || null;
        setGarden(initialGarden);

        if (!initialGarden) {
          setZones([]);
          setZoneStatuses([]);
          setSummary(null);
          return;
        }

        const [summaryData, zonesData] = await Promise.all([
          api.getDashboardSummary(initialGarden.id),
          api.getZones(initialGarden.id),
        ]);

        if (!isMounted) return;

        setSummary(summaryData);
        setZones(zonesData);

        const statuses = await Promise.all(
          zonesData.map((zone) => api.getZoneStatus(zone.id)),
        );

        if (!isMounted) return;

        setZoneStatuses(statuses);
      } catch (err) {
        if (!isMounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerateRecommendations = async () => {
    if (!zones.length) {
      setGenerateError("No plant zones available to evaluate.");
      return;
    }

    try {
      setGenerating(true);
      setGenerateError("");
      setGenerateMessage("");

      await Promise.all(zones.map((z) => api.evaluateZone(z.id)));
      setGenerateMessage("AI recommendations updated successfully based on live metrics.");

      const [summaryData, statuses] = await Promise.all([
        api.getDashboardSummary(garden?.id),
        Promise.all(zones.map((z) => api.getZoneStatus(z.id))),
      ]);

      setSummary(summaryData);
      setZoneStatuses(statuses);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to run AI evaluation."
      );
    } finally {
      setGenerating(false);
    }
  };

  const firstZoneStatus = zoneStatuses[0] || null;
  const sensorData = buildSensorData(firstZoneStatus);
  const recommendations = buildRecommendations(summary, zoneStatuses);

  const overallStatus = firstZoneStatus?.overall_status;

  const gardenStatusLabel =
    overallStatus === "normal"
      ? "Healthy Microclimate"
      : overallStatus === "advisory"
        ? "Needs Attention"
        : overallStatus === "warning"
          ? "Critical Condition"
          : "Status Unavailable";

  const gardenLocation = garden?.location_name || "Location unavailable";

  return (
    <div className="menara-dashboard">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-content">
          <header className="dashboard-header">
            <div className="dashboard-heading">
              <h1>Dashboard</h1>
              <span className="sync-label">
                <Activity size={12} />
                {loading ? "Syncing..." : "Connected to API"}
              </span>
            </div>

            <div className="garden-selector-container" style={{ position: "relative" }}>
              <button
                className="garden-selector"
                type="button"
                onClick={() => setShowGardenMenu(!showGardenMenu)}
              >
                <span className="garden-selector-icon">
                  <House size={16} />
                </span>
                <span className="garden-selector-text">
                  <strong>{garden?.name || "No Garden Available"}</strong>
                  <small>{gardenLocation}</small>
                </span>
                <ChevronDown size={15} />
              </button>

              {showGardenMenu && gardens.length > 0 && (
                <div
                  className="garden-selector-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 50,
                    backgroundColor: "#fff",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    borderRadius: "8px",
                    padding: "8px 0",
                    marginTop: "6px",
                    minWidth: "220px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {gardens.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setShowGardenMenu(false);
                        loadGardenData(g);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        width: "100%",
                        padding: "8px 16px",
                        textAlign: "left",
                        background: g.id === garden?.id ? "#f0fdf4" : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ fontSize: "13px", color: "#1e293b" }}>{g.name}</strong>
                      <small style={{ fontSize: "11px", color: "#64748b" }}>{g.location_name}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {error && (
            <div className="dashboard-error">
              Failed to load dashboard: {error}
            </div>
          )}

          {loading && (
            <div className="dashboard-loading">
              Loading dashboard data...
            </div>
          )}

          {!loading && !garden && !error && (
            <div className="dashboard-loading">
              No garden has been registered for this account yet.
            </div>
          )}

          <section className="garden-overview">
            <div className="garden-overview-info">
              <span className="overview-icon">
                <Sprout size={19} />
              </span>
              <div>
                <strong>{garden?.name || "Garden Overview"}</strong>
                <small>
                  <MapPin size={11} />
                  {gardenLocation}
                </small>
              </div>
            </div>

            <div className="garden-condition">
              <span>• {gardenStatusLabel}</span>
              <span>
                • {summary?.zones_ok ?? 0} Healthy Zones
              </span>
            </div>

            <div className="overview-divider" />

            <div className="sensor-connection">
              <strong>
                <span className="status-small-dot" />
                {zones.length} Registered Zones
              </strong>
              <small>
                {summary?.total_zones ?? zones.length} Total Zones
              </small>
            </div>

            <div className="hardware-status">
              <span>
                <BatteryFull size={15} />
                Battery: {firstZoneStatus?.latest_reading?.battery_v != null ? `${firstZoneStatus.latest_reading.battery_v}V` : "Not reported"}
              </span>
              <span>
                <Wifi size={15} />
                Signal: {firstZoneStatus?.latest_reading ? "Connected" : "No readings"}
              </span>
            </div>
          </section>

          <section className="sensor-grid">
            {sensorData.map((sensor) => (
              <SensorCard key={sensor.title} sensor={sensor} />
            ))}
          </section>

          <WeatherSection weather={summary?.weather_summary || null} />

          <RecommendationsSection
            recommendations={recommendations}
            generating={generating}
            generateError={generateError}
            generateMessage={generateMessage}
            onGenerate={handleGenerateRecommendations}
          />

          <footer className="dashboard-footer">
            <span className="footer-decoration">• • •</span>
            <span>
              © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;