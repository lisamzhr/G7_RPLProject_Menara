import { useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  Radio,
  UserRound,
  MoreVertical,
  RefreshCw,
  Clock,
  Building2,
  Droplet,
  ShieldCheck,
  Timer,
  Gauge,
  Waves,
  Zap,
  Wind,
  Lock,
  ExternalLink,
  Info,
  Signal,
  CheckCircle2,
  History,
  Smartphone,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import "../styles/devices.css";

type ServoPosition = "Closed" | "50% Vent" | "Open";

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

export const Devices = () => {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [servoPosition, setServoPosition] =
    useState<ServoPosition>("Closed");
  const [wateringTriggered, setWateringTriggered] = useState(false);
  const [notice, setNotice] = useState(
    "Controls are operating normally. All connected actuators are ready."
  );
  const [lastUpdated, setLastUpdated] = useState("3m ago");

  const getServoDegrees = () => {
    if (servoPosition === "Closed") return 0;
    if (servoPosition === "50% Vent") return 45;
    return 90;
  };

  const handleWatering = () => {
    setWateringTriggered(true);
    setNotice(
      "Manual watering triggered. The solenoid valve is active for 1 minute (demo action)."
    );

    window.setTimeout(() => {
      setWateringTriggered(false);
    }, 5000);
  };

  const handleServo = (position: ServoPosition) => {
    setServoPosition(position);
    setNotice(
      `Servo position adjusted to ${position} (${position === "Closed" ? "0°" : position === "50% Vent" ? "45°" : "90°"}). (Demo action)`
    );
  };

  const handleRefresh = () => {
    setLastUpdated("Just now");
    setNotice("Controller status refreshed successfully (demo action).");
  };

  const handleLogs = () => {
    setNotice(
      "Controller logs are available in this demo interface. Backend log integration is not connected yet."
    );
  };

  return (
    <div className="device-page">
      {/* SIDEBAR */}
      <aside className="device-sidebar">
        <div className="device-brand">
          <div className="device-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="device-brand-text">
            <h2>
              MENARA <span />
            </h2>
            <p>ROOFTOP AGRITECH</p>
          </div>
        </div>

        <nav className="device-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `device-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={21} strokeWidth={2.2} />
                <span>{item.label}</span>

                {item.tag && (
                  <span className="device-nav-tag">{item.tag}</span>
                )}

                {item.path === "/devices" && (
                  <span className="device-nav-indicator" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="device-sidebar-bottom">
          <div className="device-online-status">
            <span />
            <span>Online • Node Mesh</span>
            <Radio size={17} />
          </div>

          <div className="device-user-profile">
            <div className="device-user-avatar">
              <UserRound size={22} />
            </div>

            <div className="device-user-info">
              <strong>Dr. Ezzedine Ruzash</strong>
              <span>Lead Agronomist</span>
            </div>

            <button
              className="device-more-button"
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="device-main">
        <div className="device-content">
          {/* TOP BAR */}
          <div className="device-topbar">
            <div className="device-topbar-left">
              <div className="device-location-pill">
                <Building2 size={16} />
                <strong>Kebun Atap Menteng</strong>
                <span>/ Rooftop Block B (Zone 2B)</span>
              </div>

              <div className="device-sync-pill">
                <RefreshCw size={12} />
                Synced {lastUpdated}
              </div>
            </div>
          </div>

          {/* PAGE HEADING */}
          <header className="device-page-heading">
            <div>
              <h1>Device Control</h1>
              <p>
                Manage your garden's automated watering system and
                servo-based mechanisms.
              </p>
            </div>

            <div className="device-heading-actions">
              <button
                className="device-header-button"
                onClick={handleRefresh}
              >
                <RefreshCw size={14} />
                Refresh Controller
              </button>

              <button
                className="device-header-button logs-button"
                onClick={handleLogs}
              >
                <History size={14} />
                Logs
              </button>
            </div>
          </header>
          {/* CONTROLLER NOTICE */}
          <div className="device-notice" role="status">
            <Info size={16} />
            <p>{notice}</p>
          </div>

          {/* CONTROLLER STATUS */}
          <section className="device-controller-status">
            <div className="device-controller-left">
              <div className="device-controller-icon">
                <Radio size={24} />
              </div>

              <div className="device-controller-info">
                <h2>Connected: ESP32 Garden Controller</h2>
                <p>
                  System online. All local actuators ready for automated
                  &amp; manual control.
                </p>
                <span className="device-online-badge">
                  <i />
                  Online
                </span>
              </div>
            </div>

            <div className="device-controller-metrics">
              <div className="device-controller-metric">
                <Signal size={15} />
                <span>Mesh RSSI:</span>
                <strong>-58 dBm (Strong)</strong>
              </div>

              <div className="device-metric-divider" />

              <div className="device-controller-metric">
                <Zap size={16} />
                <span>Supply:</span>
                <strong>12.4V DC</strong>
              </div>
            </div>
          </section>

          {/* DEVICE CARDS */}
          <section className="device-control-grid">
            {/* AUTOMATIC WATERING */}
            <article className="device-control-card watering-card">
              <div className="device-card-content">
                <div className="device-card-heading">
                  <div className="device-card-icon watering-icon">
                    <Droplet size={23} />
                  </div>

                  <div className="device-card-title">
                    <span>SOLENOID HYDRATION LINE</span>
                    <h2>Automatic Watering System</h2>
                  </div>

                  <span className="device-state-badge active-badge">
                    <i />
                    Active
                  </span>
                </div>

                <div className="device-card-divider" />

                {/* AUTOMATION MODE */}
                <div className="automation-control">
                  <div>
                    <strong>Automation Mode</strong>
                    <span>
                      Toggle automated soil threshold watering
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={automationEnabled}
                    aria-label="Toggle automation mode"
                    className={`device-toggle ${
                      automationEnabled ? "enabled" : ""
                    }`}
                    onClick={() => {
                      const nextValue = !automationEnabled;
                      setAutomationEnabled(nextValue);
                      setNotice(
                        nextValue
                          ? "Automation Mode enabled. Automatic watering is active (demo action)."
                          : "Automation Mode disabled. Watering now requires manual control (demo action)."
                      );
                    }}
                  >
                    <span>
                      {automationEnabled ? (
                        <CheckCircle2 size={16} />
                      ) : null}
                    </span>
                  </button>
                </div>

                {/* AUTOMATION MESSAGE */}
                <div
                  className={`device-message-box ${
                    automationEnabled ? "success-message" : "warning-message"
                  }`}
                >
                  <ShieldCheck size={19} />
                  <p>
                    {automationEnabled
                      ? "Automated watering is active. Micro-sprayers will dispense moisture when soil hydration drops below target thresholds."
                      : "Automated watering is paused. Use manual watering control when your garden needs additional moisture."}
                  </p>
                </div>

                {/* WATERING METRICS */}
                <div className="watering-metrics">
                  <div>
                    <span>Target Moisture</span>
                    <strong>&gt; 65% RH</strong>
                  </div>

                  <div>
                    <span>Last Watering</span>
                    <strong>45 mins ago</strong>
                  </div>

                  <div>
                    <span>Valve State</span>
                    <strong>
                      {wateringTriggered ? "Open (Active)" : "Closed (Standby)"}
                    </strong>
                  </div>
                </div>

                {/* MANUAL WATERING BUTTON */}
                <button
                  className={`device-watering-button ${
                    wateringTriggered ? "watering-active" : ""
                  }`}
                  onClick={handleWatering}
                  disabled={wateringTriggered}
                >
                  <Timer size={17} />
                  {wateringTriggered
                    ? "Watering Triggered"
                    : "Trigger 1-Min Watering"}
                </button>
              </div>

              {/* CARD FOOTER */}
              <div className="device-card-footer">
                <div>
                  <Gauge size={14} />
                  <span>Pressure: <strong>2.4 Bar</strong></span>
                </div>

                <div>
                  <Waves size={14} />
                  <span>Flow Rate: <strong>1.8 L/m</strong></span>
                </div>

                <div>
                  <Clock size={14} />
                  <span>Sync: <strong>14:20 WIB</strong></span>
                </div>
              </div>
            </article>

            {/* SERVO CONTROL */}
            <article className="device-control-card servo-card">
              <div className="device-card-content">
                <div className="device-card-heading servo-heading">
                  <div className="device-card-icon servo-icon">
                    <Wind size={23} />
                  </div>

                  <div className="device-card-title">
                    <span>ROOF VENTILATION / CANOPY SHADE</span>
                    <h2>Servo Mechanism Control</h2>
                  </div>

                  <span className="device-state-badge position-badge">
                    <i />
                    Position: {servoPosition}
                  </span>
                </div>

                <div className="device-card-divider" />

                {/* SERVO POSITION */}
                <div className="servo-position-panel">
                  <div className="servo-position-heading">
                    <div>
                      <Smartphone size={17} />
                      <strong>
                        Current Position: {servoPosition} (
                        {getServoDegrees()}° / Secure)
                      </strong>
                    </div>

                    <span>{(getServoDegrees() / 90) * 100}% OPEN</span>
                  </div>

                  <div className="servo-progress-track">
                    <div
                      className="servo-progress-fill"
                      style={{
                        width: `${(getServoDegrees() / 90) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="servo-scale">
                    <span>0° Closed</span>
                    <span>45° Half Vent</span>
                    <span>90° Open</span>
                  </div>
                </div>

                {/* SERVO MESSAGE */}
                <div className="device-message-box success-message servo-message">
                  <Info size={19} />
                  <p>
                    Servo motor is connected and calibrated. Adjust
                    position to control canopy ventilation and airflow.
                  </p>
                </div>

                {/* SERVO BUTTONS */}
                <div className="servo-control-buttons">
                  <button
                    className={`servo-button ${
                      servoPosition === "Closed" ? "selected" : ""
                    }`}
                    onClick={() => handleServo("Closed")}
                  >
                    <Lock size={15} />
                    Close
                  </button>

                  <button
                    className={`servo-button ${
                      servoPosition === "50% Vent" ? "selected" : ""
                    }`}
                    onClick={() => handleServo("50% Vent")}
                  >
                    50% Vent
                  </button>

                  <button
                    className={`servo-button ${
                      servoPosition === "Open" ? "selected" : ""
                    }`}
                    onClick={() => handleServo("Open")}
                  >
                    Open
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              {/* CARD FOOTER */}
              <div className="device-card-footer servo-footer">
                <div>
                  <ShieldCheck size={14} />
                  <span>
                    Servo Torque: <strong>0.2 Nm Idle</strong>
                  </span>
                </div>

                <div>
                  <Wind size={14} />
                  <span>
                    Air Venting: <strong>Normal</strong>
                  </span>
                </div>

                <div>
                  <SlidersHorizontal size={14} />
                  <span>
                    Zero Point <strong>Calibrated</strong>
                  </span>
                </div>
              </div>
            </article>
          </section>

          {/* SAFETY INTERLOCK */}
          <section className="device-safety-card">
            <div className="device-safety-icon">
              <ShieldCheck size={23} />
            </div>

            <div className="device-safety-text">
              <h3>Safety Interlock &amp; Controller Fail-Safe Protection</h3>
              <p>
                Controls automatically lock when controller connection is
                lost to prevent actuator desynchronization.
              </p>
            </div>
          </section>
          </div>

        {/* FOOTER */}
        <footer className="device-footer">
          <span className="device-footer-dots">•••</span>
          <span>
            © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
          </span>
        </footer>
      </main>
    </div>
  );
};

export default Devices;