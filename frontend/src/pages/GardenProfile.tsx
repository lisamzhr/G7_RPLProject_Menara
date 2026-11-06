import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  MapPin,
  ChevronDown,
  RefreshCw,
  Leaf,
  Radio,
  UserRound,
  LogOut,
  Clock3,
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
import type { Garden, PlantZone, Reading } from "../types";
import "../styles/garden-profile.css";

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
  { label: "Device Control", path: "/devices", icon: SlidersHorizontal },
  { label: "Settings", path: "/settings", icon: Settings },
];

export const GardenProfile = () => {
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<TimeRange>("24 Hours");
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<PlantZone | null>(null);
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

  // When selected zone or time range changes: fetch readings
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
        console.error("Failed to load historical readings:", err);
      }
    };
    loadReadings();
    return () => {
      isMounted = false;
    };
  }, [selectedZone, timeRange]);

  // Format chart data
  const chartData = readings.map((r) => ({
    time: formatTimestamp(r.ts),
    temperature: r.temperature_c,
    humidity: r.humidity_pct,
    moisture: r.soil_moisture_pct,
  }));

  // Dynamic crops from zones
  const activeCrops = zones.flatMap((z) =>
    z.plant_names.map((plantName) => ({
      name: plantName,
      stage: z.category.name,
      categoryKey: z.category.key,
      zoneLabel: z.label,
    }))
  );

  return (
    <div className="garden-page">
      {/* SIDEBAR */}
      <aside className="garden-sidebar">
        <div className="garden-brand">
          <div className="garden-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="garden-brand-text">
            <h2>
              MENARA <span className="brand-status-dot" />
            </h2>
            <p>ROOFTOP AGRITECH</p>
          </div>
        </div>

        <nav className="garden-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `garden-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={21} strokeWidth={2.2} />
                <span>{item.label}</span>

                {item.tag && <span className="garden-nav-tag">{item.tag}</span>}

                {item.path === "/garden-profile" && (
                  <span className="garden-nav-indicator" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="garden-sidebar-bottom">
          <div className="garden-online-status">
            <span className="online-dot" />
            <span>Online • Node Mesh</span>
            <Radio size={19} />
          </div>

          <div className="garden-user-profile">
            <div className="garden-user-avatar">
              <UserRound size={22} />
            </div>

            <div className="garden-user-info">
              <strong title={userName}>{userName}</strong>
              <span>{userRole}</span>
            </div>

            <button
              className="garden-more-button"
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
      <main className="garden-main">
        <div className="garden-main-content">
          {/* TOP BAR */}
          <div className="garden-topbar">
            <div className="garden-page-identity">
              <span className="garden-profile-label">
                <span className="online-dot" />
                ROOFTOP GARDEN PROFILE
              </span>
              <span className="garden-id">
                {selectedGarden ? `ADM4: ${selectedGarden.adm4_code}` : "ID: MNT-JKT-B2"}
              </span>
            </div>

            <div className="garden-topbar-actions">
              <div className="garden-sync-status">
                <RefreshCw size={17} />
                <span>{loading ? "Loading..." : "Telemetry Synced"}</span>
              </div>

              <div className="garden-location-wrapper" style={{ position: "relative" }}>
                <button
                  className="garden-location-button"
                  type="button"
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                >
                  <MapPin size={21} />
                  <span>
                    <strong>{selectedGarden?.name || "No Garden"}</strong>
                    <small>{selectedGarden?.location_name || "Select Garden"}</small>
                  </span>
                  <ChevronDown size={18} />
                </button>

                {showLocationMenu && gardens.length > 0 && (
                  <div className="garden-location-dropdown" style={{ zIndex: 50 }}>
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
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", margin: "12px 0" }}>
              {error}
            </div>
          )}

          {/* PAGE TITLE */}
          <div className="garden-heading">
            <h1>Garden Profile</h1>
            <p>
              View detailed botanical and microclimate information about your rooftop garden.
            </p>
          </div>

          {/* GARDEN OVERVIEW CARD */}
          <section className="garden-overview-card">
            <div className="garden-photo">
              <div className="garden-photo-overlay">
                <div>
                  <span>CANOPY ELEVATION {selectedGarden?.elevation_m ?? 24}m</span>
                  <h3>{selectedGarden?.name || "Rooftop Garden"}</h3>
                </div>
                <span className="sensor-node-badge">
                  {zones.length} Active {zones.length === 1 ? "Zone" : "Zones"}
                </span>
              </div>
            </div>

            <div className="garden-overview-details">
              <div className="garden-info-heading">
                <h2>{selectedGarden?.name || "Garden Overview"}</h2>
                <div className="garden-location-info">
                  <MapPin size={19} />
                  <span>
                    {selectedGarden?.location_name || "Jakarta, Indonesia"}
                  </span>
                  <span className="garden-canopy-badge">
                    {selectedGarden ? `${selectedGarden.elevation_m}m Elevation` : "Rooftop"}
                  </span>
                </div>
                <div className="telemetry-badge">
                  <span />
                  BMKG Adm4: {selectedGarden?.adm4_code || "31.71.06.1001"}
                </div>
              </div>

              <div className="garden-crops-section">
                <div className="garden-crops-heading">
                  <div>
                    <Leaf size={20} />
                    <strong>Selected Crops &amp; Active Cultivars</strong>
                  </div>
                  <span>{activeCrops.length} Active Cultivars</span>
                </div>

                <div className="garden-crops-grid">
                  {activeCrops.length > 0 ? (
                    activeCrops.map((crop, idx) => (
                      <div className="garden-crop-card" key={`${crop.name}-${idx}`}>
                        <div className={`garden-crop-icon ${crop.categoryKey}`}>
                          🌱
                        </div>

                        <div>
                          <strong>{crop.name}</strong>
                          <span>{crop.stage} • {crop.zoneLabel}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "13px", padding: "12px 0" }}>
                      No plant zones or cultivars registered yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* HISTORICAL SENSOR DATA */}
          <section className="garden-history-card">
            <div className="garden-history-header">
              <div>
                <div className="garden-history-title">
                  <h2>Historical Sensor Data</h2>
                  <span className="live-feed-badge">
                    <span />
                    {selectedZone?.label || "Zone Readings"}
                  </span>
                </div>

                <p>
                  Changes in air temperature, air humidity, and soil moisture over diurnal cycles
                </p>

                {zones.length > 1 && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelectedZone(z)}
                        style={{
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: selectedZone?.id === z.id ? "#344F3A" : "#fff",
                          color: selectedZone?.id === z.id ? "#fff" : "#475569",
                          cursor: "pointer",
                        }}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="garden-range-selector">
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

            <div className="garden-chart-container">
              {chartData.length === 0 ? (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
                  No telemetry data points available for this zone.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 18, left: 0, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="temperatureFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#344F3A"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="100%"
                          stopColor="#344F3A"
                          stopOpacity={0.01}
                        />
                      </linearGradient>

                      <linearGradient
                        id="humidityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4D78BD"
                          stopOpacity={0.16}
                        />
                        <stop
                          offset="100%"
                          stopColor="#4D78BD"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#E4EEE3"
                      strokeDasharray="3 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#718071", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />

                    <YAxis domain={["auto", "auto"]} tick={{ fill: "#718071", fontSize: 11 }} />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #DCE9DA",
                        fontSize: 12,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#344F3A"
                      strokeWidth={2.8}
                      fill="url(#temperatureFill)"
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Air Temp (°C)"
                    />

                    <Area
                      type="monotone"
                      dataKey="humidity"
                      stroke="#4D78BD"
                      strokeWidth={2.5}
                      fill="url(#humidityFill)"
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Humidity (%)"
                    />

                    <Line
                      type="monotone"
                      dataKey="moisture"
                      stroke="#7A9870"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Soil Moisture (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="garden-chart-legend">
              <div>
                <span className="legend-color temperature" />
                <strong>Air Temperature (°C)</strong>
              </div>

              <div>
                <span className="legend-color humidity" />
                <strong>Air Humidity (% RH)</strong>
              </div>

              <div>
                <span className="legend-color moisture" />
                <strong>Soil Moisture (%)</strong>
              </div>

              <span className="garden-chart-resolution">
                <Clock3 size={17} />
                Rolling {timeRange === "24 Hours" ? "24-hr" : timeRange === "7 Days" ? "7-day" : "30-day"} resolution
              </span>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="garden-footer">
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </footer>
      </main>
    </div>
  );
};

export default GardenProfile;
