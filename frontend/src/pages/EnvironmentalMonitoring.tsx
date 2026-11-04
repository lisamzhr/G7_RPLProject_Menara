import { useState } from "react";
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
  Radio,
  UserRound,
  MoreVertical,
  Thermometer,
  Droplet,
  Sun,
  Building2,
  ShieldCheck,
  Clock3,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { NavLink } from "react-router-dom";
import "../styles/environmental-monitoring.css";

type TimeRange = "24 Hours" | "7 Days" | "30 Days";

const monitoringData = {
  "24 Hours": [
    { time: "00:00", temperature: 48, humidity: 78, moisture: 67 },
    { time: "04:00", temperature: 49, humidity: 77, moisture: 66 },
    { time: "08:00", temperature: 53, humidity: 73, moisture: 65 },
    { time: "12:00", temperature: 61, humidity: 65, moisture: 64 },
    { time: "14:00", temperature: 72, humidity: 62, moisture: 63 },
    { time: "16:00", temperature: 66, humidity: 65, moisture: 63 },
    { time: "20:00", temperature: 53, humidity: 73, moisture: 66 },
    { time: "23:59", temperature: 47, humidity: 77, moisture: 67 },
  ],
  "7 Days": [
    { time: "Mon", temperature: 50, humidity: 75, moisture: 64 },
    { time: "Tue", temperature: 56, humidity: 71, moisture: 66 },
    { time: "Wed", temperature: 60, humidity: 68, moisture: 65 },
    { time: "Thu", temperature: 70, humidity: 61, moisture: 63 },
    { time: "Fri", temperature: 64, humidity: 66, moisture: 64 },
    { time: "Sat", temperature: 55, humidity: 73, moisture: 67 },
    { time: "Sun", temperature: 69, humidity: 63, moisture: 68 },
  ],
  "30 Days": [
    { time: "Week 1", temperature: 51, humidity: 76, moisture: 65 },
    { time: "Week 2", temperature: 59, humidity: 70, moisture: 64 },
    { time: "Week 3", temperature: 67, humidity: 64, moisture: 66 },
    { time: "Week 4", temperature: 62, humidity: 68, moisture: 67 },
  ],
};

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

const sensorCards = [
  {
    name: "DHT22 Sensor",
    title: "AIR TEMPERATURE",
    value: "31.2",
    unit: "°C",
    status: "Normal Range",
    statusType: "normal",
    icon: Thermometer,
    min: "Min 22°C",
    target: "Rec: 26–33°C",
    max: "Max 38°C",
    fill: "temperature",
    progress: 60,
  },
  {
    name: "DHT22 Sensor",
    title: "AIR HUMIDITY",
    value: "64",
    unit: "% RH",
    status: "Optimal",
    statusType: "optimal",
    icon: Droplet,
    min: "Low <50%",
    target: "Rec: 60–75%",
    max: "High >85%",
    fill: "humidity",
    progress: 65,
  },
  {
    name: "Capacitive",
    title: "SOIL MOISTURE",
    value: "71",
    unit: "%",
    status: "Adequate",
    statusType: "adequate",
    icon: Sprout,
    min: "Dry <45%",
    target: "Target: 65–80%",
    max: "Sat >90%",
    fill: "moisture",
    progress: 72,
  },
  {
    name: "BH1750 Sensor",
    title: "LIGHT INTENSITY",
    value: "42,500",
    unit: "lux",
    status: "High Sunlight",
    statusType: "warning",
    icon: Sun,
    min: "0 lx",
    target: "Pergola Diffused",
    max: "65k lx",
    fill: "light",
    progress: 65,
  },
];

export const EnvironmentalMonitoring = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("24 Hours");
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const chartData = monitoringData[timeRange];

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
              <strong>Dr. Ezzedine Ruzash</strong>
              <span>Lead Agronomist</span>
            </div>

            <button
              className="monitoring-more-button"
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="monitoring-main">
        <div className="monitoring-content">
          {/* LOCATION BAR */}
          <div className="monitoring-topbar">
            <div className="monitoring-location-wrapper">
              <button
                className="monitoring-location-button"
                onClick={() => setShowLocationMenu(!showLocationMenu)}
              >
                <Building2 size={17} />
                <strong>Kebun Atap Menteng</strong>
                <span>/</span>
                <small>Rooftop Block B (Zone 2B)</small>
                <ChevronDown size={16} />
              </button>

              {showLocationMenu && (
                <div className="monitoring-location-dropdown">
                  <strong>Kebun Atap Menteng</strong>
                  <span>Rooftop Block B (Zone 2B)</span>
                  <small>Currently selected garden</small>
                </div>
              )}
            </div>

            <div className="monitoring-sync">
              <RefreshCw size={13} />
              Synced 3m ago
            </div>
          </div>

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
                Real-time microclimate sensors across active planting beds
                and canopy zones.
              </p>
            </div>

            <div className="monitoring-node-card">
              <Radio size={19} />
              <div>
                <span>MONITORING NODES</span>
                <strong>4 / 4 Active Nodes</strong>
              </div>
            </div>
          </div>

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
                  <h2>Environmental Monitoring</h2>
                  <span className="monitoring-active-badge">
                    ACTIVE TELEMETRY
                  </span>
                </div>

                <p>
                  Real-time microclimate sensors across active planting beds
                  and canopy zones.
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
              <div className="monitoring-chart-highlight" />

              <div className="monitoring-chart-tooltip">
                <span>
                  <Sun size={13} />
                  14:00 WIB • DIURNAL PEAK
                </span>

                <div>
                  <strong>
                    <i className="tooltip-temp" />
                    Temp: 32.5°C
                  </strong>
                  <strong>
                    <i className="tooltip-humidity" />
                    Humidity: 64%
                  </strong>
                  <strong>
                    <i className="tooltip-moisture" />
                    Moist: 68%
                  </strong>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 50, right: 12, left: 0, bottom: 4 }}
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
                    domain={[35, 85]}
                    ticks={[35, 50, 65, 80]}
                    tickFormatter={(value) =>
                      `${value}% / ${Math.round(18 + ((value - 35) / 45) * 18)}°C`
                    }
                    tick={{ fill: "#778274", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
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
                  />

                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#4c75b9"
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke="#58734b"
                    strokeWidth={2.3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
                  Rolling {timeRange === "24 Hours" ? "24-hr" : timeRange === "7 Days" ? "7-day" : "30-day"} resolution • All 4 mesh nodes broadcasting
                </div>

                <div className="monitoring-normal-status">
                  <ShieldCheck size={15} />
                  Abnormal readings: None detected (0 thresholds breached)
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
