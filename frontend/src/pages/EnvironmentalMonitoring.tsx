import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  ChevronDown,
  RefreshCw,
  Radio,
  UserRound,
  LogOut,
  Thermometer,
  Droplet,
  Sun,
  Building2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { formatTimestamp } from "../lib/format";
import type { Garden, ParameterMetric, PlantZone, Reading, ZoneStatus } from "../types";
import "../styles/environmental-monitoring.css";

type TimeRange = "24 Hours" | "7 Days" | "30 Days";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Garden Profile", path: "/garden-profile", icon: Sprout },
  {
    label: "Environmental Monitoring",
    path: "/monitoring",
    icon: Activity,
  },
  {
    label: "AI Recommendations",
    path: "/recommendations",
    icon: Brain,
    tag: "AI",
  },
  {
    label: "Device Control",
    path: "/devices",
    icon: SlidersHorizontal,
  },
  { label: "Settings", path: "/settings", icon: Settings },
];

export const EnvironmentalMonitoring = () => {
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<TimeRange>("24 Hours");
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<PlantZone | null>(null);
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      // fallback
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("roofgarden_token");
    sessionStorage.removeItem("roofgarden_token");
    localStorage.removeItem("roofgarden_user");
    sessionStorage.removeItem("roofgarden_user");
    navigate("/login", { replace: true });
  };

  // Initial load: fetch gardens
  useEffect(() => {
    let isMounted = true;
    const loadGardens = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getGardens();
        if (!isMounted) return;
        setGardens(data);
        if (data.length > 0) {
          setSelectedGarden(data[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load gardens.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadGardens();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected garden changes: fetch zones
  useEffect(() => {
    if (!selectedGarden) {
      setZones([]);
      setSelectedZone(null);
      return;
    }

    let isMounted = true;
    const loadZones = async () => {
      try {
        const zoneData = await api.getZones(selectedGarden.id);
        if (!isMounted) return;
        setZones(zoneData);
        setSelectedZone(zoneData[0] || null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load plant zones.");
      }
    };
    loadZones();
    return () => {
      isMounted = false;
    };
  }, [selectedGarden]);

  // When selected zone changes: fetch zone status
  useEffect(() => {
    if (!selectedZone) {
      setZoneStatus(null);
      return;
    }

    let isMounted = true;
    const loadStatus = async () => {
      try {
        const status = await api.getZoneStatus(selectedZone.id);
        if (!isMounted) return;
        setZoneStatus(status);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load zone status:", err);
      }
    };
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [selectedZone]);

  // When selected zone or time range changes: fetch historical readings
  useEffect(() => {
    if (!selectedZone) {
      setReadings([]);
      return;
    }

    let isMounted = true;
    const loadReadings = async () => {
      try {
        const rangeParam = timeRange === "24 Hours" ? "24h" : timeRange === "7 Days" ? "7d" : "30d";
        const aggParam = timeRange === "30 Days" || timeRange === "7 Days" ? "hourly" : "raw";
        const readingData = await api.getZoneReadings(selectedZone.id, rangeParam, aggParam);
        if (!isMounted) return;
        setReadings(readingData);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load telemetry readings:", err);
      }
    };
    loadReadings();
    return () => {
      isMounted = false;
    };
  }, [selectedZone, timeRange]);

  const chartData = readings.map((r) => ({
    time: formatTimestamp(r.ts),
    temperature: r.temperature_c,
    humidity: r.humidity_pct,
    moisture: r.soil_moisture_pct,
  }));

  // Build sensor cards from live zoneStatus parameter_status
  const paramStatus = (zoneStatus?.parameter_status || {}) as Record<string, ParameterMetric>;
  const tempMetric = paramStatus.temperature;
  const humMetric = paramStatus.humidity;
  const soilMetric = paramStatus.moisture;
  const luxMetric = paramStatus.lux;
  const latestReading = zoneStatus?.latest_reading;

  const calculateProgress = (metric?: ParameterMetric) => {
    if (!metric) return 50;
    if (metric.ideal_max <= metric.ideal_min) return 50;
    const ratio = (metric.value - metric.ideal_min) / (metric.ideal_max - metric.ideal_min);
    return Math.max(10, Math.min(100, Math.round(ratio * 100)));
  };

  const sensorCards = [
    {
      name: "DHT22 Sensor",
      title: "AIR TEMPERATURE",
      value: tempMetric ? `${tempMetric.value}` : latestReading ? `${latestReading.temperature_c}` : "—",
      unit: "°C",
      status: tempMetric?.status === "ok" ? "Normal Range" : tempMetric?.status === "high" ? "Above Ideal" : "Below Ideal",
      statusType: tempMetric?.status === "ok" ? "normal" : "warning",
      icon: Thermometer,
      min: tempMetric ? `Min ${tempMetric.ideal_min}°C` : "Min —",
      target: tempMetric ? `Target: ${tempMetric.ideal_min}–${tempMetric.ideal_max}°C` : "Target —",
      max: tempMetric ? `Max ${tempMetric.ideal_max}°C` : "Max —",
      fill: "temperature",
      progress: calculateProgress(tempMetric),
    },
    {
      name: "DHT22 Sensor",
      title: "AIR HUMIDITY",
      value: humMetric ? `${humMetric.value}` : latestReading ? `${latestReading.humidity_pct}` : "—",
      unit: "% RH",
      status: humMetric?.status === "ok" ? "Optimal" : humMetric?.status === "high" ? "Above Ideal" : "Below Ideal",
      statusType: humMetric?.status === "ok" ? "optimal" : "warning",
      icon: Droplet,
      min: humMetric ? `< ${humMetric.ideal_min}%` : "Low —",
      target: humMetric ? `Target: ${humMetric.ideal_min}–${humMetric.ideal_max}%` : "Target —",
      max: humMetric ? `> ${humMetric.ideal_max}%` : "High —",
      fill: "humidity",
      progress: calculateProgress(humMetric),
    },
    {
      name: "Capacitive Sensor",
      title: "SOIL MOISTURE",
      value: soilMetric ? `${soilMetric.value}` : latestReading ? `${latestReading.soil_moisture_pct}` : "—",
      unit: "%",
      status: soilMetric?.status === "ok" ? "Optimal" : soilMetric?.status === "low" ? "Dry / Low" : "Saturated",
      statusType: soilMetric?.status === "ok" ? "adequate" : "warning",
      icon: Sprout,
      min: soilMetric ? `< ${soilMetric.ideal_min}%` : "Dry —",
      target: soilMetric ? `Target: ${soilMetric.ideal_min}–${soilMetric.ideal_max}%` : "Target —",
      max: soilMetric ? `> ${soilMetric.ideal_max}%` : "Max —",
      fill: "moisture",
      progress: calculateProgress(soilMetric),
    },
    {
      name: "BH1750 Sensor",
      title: "LIGHT INTENSITY",
      value: luxMetric ? Number(luxMetric.value).toLocaleString() : latestReading ? Number(latestReading.lux).toLocaleString() : "—",
      unit: "lux",
      status: luxMetric?.status === "ok" ? "Optimal" : luxMetric?.status === "high" ? "High Sunlight" : "Low Light",
      statusType: luxMetric?.status === "ok" ? "normal" : "warning",
      icon: Sun,
      min: luxMetric ? `${Number(luxMetric.ideal_min).toLocaleString()} lx` : "0 lx",
      target: luxMetric ? `${Number(luxMetric.ideal_min).toLocaleString()}–${Number(luxMetric.ideal_max).toLocaleString()} lx` : "Target —",
      max: luxMetric ? `${Number(luxMetric.ideal_max).toLocaleString()} lx` : "65k lx",
      fill: "light",
      progress: calculateProgress(luxMetric),
    },
  ];

  const abnormalCount = Object.values(paramStatus).filter((m) => m.status !== "ok").length;

  return (
    <div className="monitoring-page">
      {/* SIDEBAR */}
      <aside className="monitoring-sidebar">
        <div className="monitoring-brand">
          <div className="monitoring-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="monitoring-brand-text">
            <h2>
              MENARA <span className="monitoring-brand-dot" />
            </h2>
            <p>ROOFTOP AGRITECH</p>
          </div>
        </div>

        <nav className="monitoring-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `monitoring-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={21} strokeWidth={2.2} />
                <span>{item.label}</span>

                {item.tag && (
                  <span className="monitoring-nav-tag">{item.tag}</span>
                )}

                {item.path === "/monitoring" && (
                  <span className="monitoring-nav-indicator" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="monitoring-sidebar-bottom">
          <div className="monitoring-online-status">
            <span className="monitoring-online-dot" />
            <span>Online • Node Mesh</span>
            <Radio size={17} />
          </div>

          <div className="monitoring-user-profile">
            <div className="monitoring-user-avatar">
              <UserRound size={22} />
            </div>

            <div className="monitoring-user-info">
              <strong title={userName}>{userName}</strong>
              <span>{userRole}</span>
            </div>

            <button
              className="monitoring-more-button"
              aria-label="Log out"
              title="Log out"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="monitoring-main">
        <div className="monitoring-content">
          {/* LOCATION BAR */}
          <div className="monitoring-topbar">
            <div className="monitoring-location-wrapper" style={{ position: "relative" }}>
              <button
                className="monitoring-location-button"
                type="button"
                onClick={() => setShowLocationMenu(!showLocationMenu)}
              >
                <Building2 size={17} />
                <strong>{selectedGarden?.name || "No Garden"}</strong>
                <span>/</span>
                <small>{selectedZone?.label || "Select Zone"}</small>
                <ChevronDown size={16} />
              </button>

              {showLocationMenu && gardens.length > 0 && (
                <div className="monitoring-location-dropdown" style={{ zIndex: 50 }}>
                  <strong>Select Garden</strong>
                  {gardens.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        padding: "6px 0",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onClick={() => {
                        setSelectedGarden(g);
                        setShowLocationMenu(false);
                      }}
                    >
                      <strong style={{ display: "block", color: "#1e293b" }}>{g.name}</strong>
                      <small style={{ color: "#64748b" }}>{g.location_name}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="monitoring-sync">
              <RefreshCw size={13} />
              {loading ? "Loading..." : "Live Telemetry Connected"}
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", margin: "12px 0" }}>
              {error}
            </div>
          )}

          {/* PAGE HEADING */}
          <div className="monitoring-heading">
            <div>
              <div className="monitoring-title-row">
                <h1>Environmental Monitoring</h1>
                <span className="monitoring-active-badge">
                  ACTIVE TELEMETRY
                </span>
              </div>

              <p>
                Real-time microclimate sensors across active planting beds and canopy zones.
              </p>
            </div>

            <div className="monitoring-node-card">
              <Radio size={19} />
              <div>
                <span>MONITORING ZONES</span>
                <strong>{zones.length} Active Zones</strong>
              </div>
            </div>
          </div>

          {/* ZONE SELECTOR BUTTONS */}
          {zones.length > 1 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZone(z)}
                  style={{
                    fontSize: "13px",
                    fontWeight: selectedZone?.id === z.id ? "600" : "400",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: selectedZone?.id === z.id ? "#28452e" : "#fff",
                    color: selectedZone?.id === z.id ? "#fff" : "#334155",
                    cursor: "pointer",
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          )}

          {/* SENSOR CARDS */}
          <section className="monitoring-sensor-grid">
            {sensorCards.map((sensor) => {
              const Icon = sensor.icon;

              return (
                <article className="monitoring-sensor-card" key={sensor.title}>
                  <div className="monitoring-sensor-top">
                    <div className="monitoring-sensor-type">
                      <div className="monitoring-sensor-icon">
                        <Icon size={19} />
                      </div>
                      <span>{sensor.name}</span>
                    </div>

                    <span
                      className={`monitoring-sensor-status ${sensor.statusType}`}
                    >
                      <span />
                      {sensor.status}
                    </span>
                  </div>

                  <div className="monitoring-sensor-reading">
                    <span>{sensor.title}</span>
                    <div>
                      <strong>{sensor.value}</strong>
                      <small>{sensor.unit}</small>
                    </div>
                  </div>

                  <div className={`monitoring-progress ${sensor.fill}`}>
                    <div>
                      <span style={{ width: `${sensor.progress}%` }} />
                    </div>
                  </div>

                  <div className="monitoring-sensor-scale">
                    <span>{sensor.min}</span>
                    <strong>{sensor.target}</strong>
                    <span>{sensor.max}</span>
                  </div>
                </article>
              );
            })}
          </section>

          {/* HISTORICAL CHART */}
          <section className="monitoring-history-card">
            <div className="monitoring-history-heading">
              <div>
                <div className="monitoring-title-row">
                  <h2>{selectedZone?.label || "Zone Microclimate History"}</h2>
                  <span className="monitoring-active-badge">
                    {readings.length} SAMPLES
                  </span>
                </div>

                <p>
                  Telemetry variations over diurnal cycles across temperature, humidity, and substrate moisture.
                </p>
              </div>

              <div className="monitoring-range-selector">
                {(["24 Hours", "7 Days", "30 Days"] as TimeRange[]).map(
                  (range) => (
                    <button
                      key={range}
                      className={timeRange === range ? "selected" : ""}
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="monitoring-chart">
              {chartData.length === 0 ? (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
                  No historical telemetry data recorded for this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 12, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id="monitoringTemperatureFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#28452e"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#28452e"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#e1e5d9"
                      strokeDasharray="3 4"
                      vertical={true}
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#697668", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dy={12}
                    />

                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "#778274", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 9,
                        border: "1px solid #e0e8dc",
                        fontSize: 11,
                      }}
                      labelStyle={{
                        color: "#28452e",
                        fontWeight: 700,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#203d29"
                      strokeWidth={2.8}
                      fill="url(#monitoringTemperatureFill)"
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Air Temp (°C)"
                    />

                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#4c75b9"
                      strokeWidth={2.4}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Humidity (%)"
                    />

                    <Line
                      type="monotone"
                      dataKey="moisture"
                      stroke="#58734b"
                      strokeWidth={2.3}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Soil Moisture (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* CHART LEGEND AND STATUS */}
            <div className="monitoring-chart-bottom">
              <div className="monitoring-legend">
                <div>
                  <span className="legend-temp" />
                  <strong>Air Temperature (°C)</strong>
                </div>

                <div>
                  <span className="legend-humidity" />
                  <strong>Air Humidity (% RH)</strong>
                </div>

                <div>
                  <span className="legend-moisture" />
                  <strong>Soil Moisture (%)</strong>
                </div>
              </div>

              <div className="monitoring-chart-statuses">
                <div className="monitoring-resolution">
                  <Radio size={14} />
                  Rolling {timeRange === "24 Hours" ? "24-hr" : timeRange === "7 Days" ? "7-day" : "30-day"} resolution
                </div>

                <div className="monitoring-normal-status">
                  {abnormalCount === 0 ? (
                    <>
                      <ShieldCheck size={15} />
                      Abnormal readings: None detected (all parameters optimal)
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={15} color="#e11d48" />
                      Abnormal readings: {abnormalCount} parameters out of optimal bounds
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="monitoring-footer">
          <span className="monitoring-footer-dots">•••</span>
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </footer>
      </main>
    </div>
  );
};

export default EnvironmentalMonitoring;
