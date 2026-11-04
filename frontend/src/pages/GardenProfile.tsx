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
  Leaf,
  Radio,
  UserRound,
  MoreVertical,
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

import { NavLink } from "react-router-dom";
import "../styles/garden-profile.css";

type TimeRange = "24 Hours" | "7 Days" | "30 Days";

const sensorData = {
  "24 Hours": [
    { time: "00:00", temperature: 28, humidity: 67, moisture: 49 },
    { time: "04:00", temperature: 27, humidity: 66, moisture: 48 },
    { time: "08:00", temperature: 29, humidity: 60, moisture: 54 },
    { time: "12:00", temperature: 32.5, humidity: 52, moisture: 64 },
    { time: "14:00", temperature: 33, humidity: 51, moisture: 68 },
    { time: "16:00", temperature: 31, humidity: 55, moisture: 63 },
    { time: "20:00", temperature: 29, humidity: 61, moisture: 57 },
    { time: "23:59", temperature: 28, humidity: 66, moisture: 52 },
  ],
  "7 Days": [
    { time: "Mon", temperature: 28, humidity: 67, moisture: 49 },
    { time: "Tue", temperature: 30, humidity: 62, moisture: 53 },
    { time: "Wed", temperature: 31, humidity: 58, moisture: 59 },
    { time: "Thu", temperature: 32, humidity: 55, moisture: 65 },
    { time: "Fri", temperature: 29, humidity: 64, moisture: 61 },
    { time: "Sat", temperature: 30, humidity: 60, moisture: 56 },
    { time: "Sun", temperature: 32, humidity: 54, moisture: 68 },
  ],
  "30 Days": [
    { time: "Week 1", temperature: 27, humidity: 68, moisture: 48 },
    { time: "Week 2", temperature: 29, humidity: 64, moisture: 54 },
    { time: "Week 3", temperature: 31, humidity: 59, moisture: 61 },
    { time: "Week 4", temperature: 32, humidity: 55, moisture: 68 },
  ],
};

const crops = [
  {
    name: "Bok Choy",
    stage: "Vegetative",
    icon: "♧",
    type: "plant",
  },
  {
    name: "Cherry",
    stage: "Flowering",
    icon: "♙",
    type: "fruit",
  },
  {
    name: "Water Spi",
    stage: "Mature",
    icon: "♣",
    type: "leaf",
  },
  {
    name: "Hydro Mint",
    stage: "Sprouting",
    icon: "❀",
    type: "herb",
  },
];

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
  const [timeRange, setTimeRange] = useState<TimeRange>("24 Hours");
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const currentData = sensorData[timeRange];

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
              <strong>Dr. Ezzedine Ruzash</strong>
              <span>Lead Agronomist</span>
            </div>

            <button className="garden-more-button" aria-label="More options">
              <MoreVertical size={20} />
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
              <span className="garden-id">ID: MNT-JKT-B2</span>
            </div>

            <div className="garden-topbar-actions">
              <div className="garden-sync-status">
                <RefreshCw size={17} />
                <span>Synced 2m ago</span>
              </div>

              <div className="garden-location-wrapper">
                <button
                  className="garden-location-button"
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                >
                  <MapPin size={21} />
                  <span>
                    <strong>Kebun Atap Menteng</strong>
                    <small>Rooftop Block B (Zone 2B)</small>
                  </span>
                  <ChevronDown size={18} />
                </button>

                {showLocationMenu && (
                  <div className="garden-location-dropdown">
                    <strong>Selected Garden</strong>
                    <span>Kebun Atap Menteng</span>
                    <small>Rooftop Block B • Zone 2B</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAGE TITLE */}
          <div className="garden-heading">
            <h1>Garden Profile</h1>
            <p>
              View detailed information about your rooftop garden and its
              current conditions.
            </p>
          </div>

          {/* GARDEN OVERVIEW CARD */}
          <section className="garden-overview-card">
            <div className="garden-photo">
              <div className="garden-photo-overlay">
                <div>
                  <span>CANOPY SECTOR 2B</span>
                  <h3>Kebun Atap Menteng</h3>
                </div>
                <span className="sensor-node-badge">Active Sensor Node</span>
              </div>
            </div>

            <div className="garden-overview-details">
              <div className="garden-info-heading">
                <h2>Kebun Atap Menteng</h2>
                <div className="garden-location-info">
                  <MapPin size={19} />
                  <span>
                    Menteng, Central Jakarta • Rooftop Block B (Zone 2B)
                  </span>
                  <span className="garden-canopy-badge">450 m² Canopy</span>
                </div>
                <div className="telemetry-badge">
                  <span />
                  Telemetry Synced
                </div>
              </div>

              <div className="garden-crops-section">
                <div className="garden-crops-heading">
                  <div>
                    <Leaf size={20} />
                    <strong>Selected Crops &amp; Active Cultivars</strong>
                  </div>
                  <span>4 Active Species</span>
                </div>

                <div className="garden-crops-grid">
                  {crops.map((crop) => (
                    <div className="garden-crop-card" key={crop.name}>
                      <div className={`garden-crop-icon ${crop.type}`}>
                        {crop.icon}
                      </div>

                      <div>
                        <strong>{crop.name}</strong>
                        <span>Stage: {crop.stage}</span>
                      </div>
                    </div>
                  ))}
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
                    Live Feed
                  </span>
                </div>

                <p>
                  Changes in air temperature, air humidity, and soil moisture
                  over diurnal cycles
                </p>
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
              <div className="garden-chart-tooltip">
                <span>14:00 WIB • DIURNAL PEAK</span>
                <div>
                  <strong>Temp: 32.5°C</strong>
                  <i />
                  <strong>Humidity: 64%</strong>
                  <i />
                  <strong>Moist: 68%</strong>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={currentData}
                  margin={{ top: 70, right: 18, left: 0, bottom: 8 }}
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

                  <YAxis hide domain={[20, 75]} />

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
                  />

                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="#4D78BD"
                    strokeWidth={2.5}
                    fill="url(#humidityFill)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke="#7A9870"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
