import React from "react";
import { Link } from "react-router-dom";
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
  MoreVertical,
  Check,
} from "lucide-react";

import "../styles/dashboard.css";

const sensorData = [
  {
    title: "AIR TEMPERATURE",
    sensor: "DHT22 Sensor",
    value: "31.2",
    unit: "°C",
    status: "Normal Range",
    recommendation: "Rec: 26–33°C",
    icon: Thermometer,
    level: 6,
    color: "green",
  },
  {
    title: "AIR HUMIDITY",
    sensor: "DHT22 Sensor",
    value: "64",
    unit: "%",
    status: "Optimal",
    recommendation: "Rec: 60–75%",
    icon: Droplet,
    level: 6,
    color: "green",
  },
  {
    title: "SOIL MOISTURE",
    sensor: "Capacitive v1.2",
    value: "71",
    unit: "%",
    status: "Adequate",
    recommendation: "Depth 15cm • B3",
    icon: Sprout,
    level: 7,
    color: "green",
  },
  {
    title: "LIGHT INTENSITY",
    sensor: "BH1750 Lux Sensor",
    value: "42,500",
    unit: "lux",
    status: "High Sunlight",
    recommendation: "",
    icon: Sun,
    level: 7,
    color: "gold",
  },
];

const recommendations = [
  {
    title: "Delay Afternoon Misting",
    description:
      "Rain forecast at 16:00 combined with 71% soil moisture indicates sufficient hydration. Postponing misting prevents root saturation.",
    device: "Solenoid Bank 02 (Valve A)",
    priority: "High Priority",
    action: "Postpone",
    icon: Droplet,
    type: "high",
  },
  {
    title: "Deploy Canopy Shade Cloth",
    description:
      "Ambient light exceeds 40,000 lux peak irradiance. Adjust motorized shade net over Bok Choy beds to mitigate solar leaf scorch.",
    device: "Motorized Retractable Pergola",
    priority: "Medium Priority",
    action: "Engage",
    icon: House,
    type: "medium",
  },
];

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
              className={`dashboard-nav-link ${item.active ? "active" : ""}`}
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
            <strong>Dr. Ezzedine Ruzash</strong>
            <small>Lead Agronomist</small>
          </div>
          <button className="profile-menu" aria-label="Profile menu">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SensorCard({
  sensor,
}: {
  sensor: (typeof sensorData)[number];
}) {
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

function WeatherSection() {
  return (
    <section className="dashboard-panel weather-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="panel-icon weather-icon">
            <CloudSun size={19} />
          </span>
          <h2>BMKG Weather Integration</h2>
        </div>
        <span className="source-tag">BMKG Jakarta Pusat</span>
      </div>

      <div className="weather-current">
        <div className="weather-current-main">
          <CloudSun className="weather-main-icon" size={34} />
          <div>
            <strong>32°C</strong>
            <span>Feels 36°C • Partly Cloudy (Cerah Berawan)</span>
          </div>
        </div>

        <div className="rain-probability">
          <small>RAIN PROB.</small>
          <strong>65%</strong>
        </div>
      </div>

      <p className="weather-alert">
        Afternoon convective rain expected <strong>15:30 - 17:00 WIB</strong>{" "}
        with localized wind gusts up to 14 km/h over rooftop canopy structures.
      </p>

      <div className="weather-forecast">
        <div className="forecast-item">
          <small>14:00 WIB</small>
          <Sun size={17} className="sunny-icon" />
          <strong>33°C</strong>
          <span>Sunny</span>
        </div>

        <div className="forecast-item active">
          <small>16:00 WIB</small>
          <CloudRain size={17} />
          <strong>29°C</strong>
          <span>Light Rain</span>
        </div>

        <div className="forecast-item">
          <small>18:00 WIB</small>
          <Cloud size={17} />
          <strong>27°C</strong>
          <span>Overcast</span>
        </div>
      </div>

      <div className="weather-footer">
        <span>
          <span className="status-small-dot" />
          Live Sync Valid
        </span>
      </div>
    </section>
  );
}

function RecommendationsSection() {
  return (
    <section className="dashboard-panel recommendations-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <span className="panel-icon ai-icon">
            <Sparkles size={19} />
          </span>
          <h2>AI Recommendations</h2>
        </div>
        <span className="engine-tag">Agronomy Engine Active</span>
      </div>

      <div className="recommendation-list">
        {recommendations.map((item) => {
          const Icon = item.icon;

          return (
            <article className="recommendation-card" key={item.title}>
              <div className="recommendation-top">
                <h3>
                  <Icon size={15} />
                  {item.title}
                </h3>
                <span className={`priority-tag ${item.type}`}>
                  {item.priority}
                </span>
              </div>

              <p>{item.description}</p>

              <div className="recommendation-bottom">
                <small>{item.device}</small>
                <button className="recommendation-action">
                  {item.action}
                  <Check size={12} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="recommendation-footer">
        <span>Rule confidence: 96.4%</span>
        <strong>2 Actions Suggested</strong>
      </div>
    </section>
  );
}

export const Dashboard: React.FC = () => {
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
                Synced 3m ago
              </span>
            </div>

            <button className="garden-selector">
              <span className="garden-selector-icon">
                <House size={16} />
              </span>
              <span className="garden-selector-text">
                <strong>Kebun Atap Menteng - Rooftop Block B</strong>
                <small>Central Jakarta • Zone 2B</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </header>

          <section className="garden-overview">
            <div className="garden-overview-info">
              <span className="overview-icon">
                <Sprout size={19} />
              </span>
              <div>
                <strong>Kebun Atap Menteng</strong>
                <small>
                  <MapPin size={11} />
                  Central Jakarta (Zone 2B)
                </small>
              </div>
            </div>

            <div className="garden-condition">
              <span>• Healthy Microclimate</span>
              <span>• Optimal Growth Conditions</span>
            </div>

            <div className="overview-divider" />

            <div className="sensor-connection">
              <strong>
                <span className="status-small-dot" />
                4/4 Sensors Online
              </strong>
              <small>(DHT22, Soil, BH1750, ESP32)</small>
            </div>

            <div className="hardware-status">
              <span>
                <BatteryFull size={15} />
                Solar Battery 94%
              </span>
              <span>
                <Wifi size={15} />
                Strong Signal
              </span>
            </div>
          </section>

          <section className="sensor-grid">
            {sensorData.map((sensor) => (
              <SensorCard key={sensor.title} sensor={sensor} />
            ))}
          </section>

          <WeatherSection />

          <RecommendationsSection />

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