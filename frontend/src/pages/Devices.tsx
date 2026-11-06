import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  Radio,
  UserRound,
  LogOut,
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
  Info,
  Signal,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { formatDateTime } from "../lib/format";
import type { ActuatorItem, Garden, PlantZone } from "../types";
import "../styles/devices.css";

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
  const navigate = useNavigate();

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [actuators, setActuators] = useState<ActuatorItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(30);

  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [notice, setNotice] = useState(
    "Connected actuators ready for automated & manual control."
  );
  const [errorNotice, setErrorNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [showGardenMenu, setShowGardenMenu] = useState(false);

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
        const data = await api.getGardens();
        if (!isMounted) return;
        setGardens(data);
        if (data.length > 0) {
          setSelectedGarden(data[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorNotice(err instanceof Error ? err.message : "Failed to load gardens.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadGardens();
    return () => {
      isMounted = false;
    };
  }, []);

  // When garden changes: fetch zones
  useEffect(() => {
    if (!selectedGarden) {
      setZones([]);
      return;
    }
    let isMounted = true;
    const loadZones = async () => {
      try {
        const zoneData = await api.getZones(selectedGarden.id);
        if (!isMounted) return;
        setZones(zoneData);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load zones:", err);
      }
    };
    loadZones();
    return () => {
      isMounted = false;
    };
  }, [selectedGarden]);

  // Load actuators
  const loadActuators = async () => {
    try {
      setLoading(true);
      setErrorNotice("");
      const data = await api.getActuators();
      setActuators(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : "Failed to load actuators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActuators();
  }, []);

  const handleCommand = async (
    actuatorId: string,
    command: "turn_on" | "turn_off",
    duration = durationSeconds
  ) => {
    try {
      setActionLoadingId(actuatorId);
      setErrorNotice("");
      const res = await api.commandActuator(actuatorId, command, duration);
      setNotice(`Command '${command}' queued successfully (Command ID: ${res.command_id.slice(0, 8)}...).`);
      await loadActuators();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send command to actuator.";
      setErrorNotice(msg);
      setNotice(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

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
              <strong title={userName}>{userName}</strong>
              <span>{userRole}</span>
            </div>

            <button
              className="device-more-button"
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
      <main className="device-main">
        <div className="device-content">
          {/* TOP BAR */}
          <div className="device-topbar">
            <div className="device-topbar-left">
              <div className="device-location-pill" style={{ position: "relative" }}>
                <Building2 size={16} />
                <button
                  type="button"
                  onClick={() => setShowGardenMenu(!showGardenMenu)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "13px",
                    color: "#334155",
                  }}
                >
                  <strong>{selectedGarden?.name || "No Garden"}</strong>
                  <span>/ {selectedGarden?.location_name || "Location"}</span>
                  <ChevronDown size={14} />
                </button>

                {showGardenMenu && gardens.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      zIndex: 50,
                      background: "#fff",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      borderRadius: "8px",
                      padding: "6px 0",
                      marginTop: "6px",
                      minWidth: "220px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {gardens.map((g) => (
                      <div
                        key={g.id}
                        style={{
                          padding: "8px 16px",
                          cursor: "pointer",
                          background: g.id === selectedGarden?.id ? "#f0fdf4" : "transparent",
                        }}
                        onClick={() => {
                          setSelectedGarden(g);
                          setShowGardenMenu(false);
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>{g.name}</strong>
                        <small style={{ color: "#64748b", fontSize: "11px" }}>{g.location_name}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="device-sync-pill">
                <RefreshCw size={12} className={loading ? "spin" : ""} />
                Synced {lastUpdated}
              </div>
            </div>
          </div>

          {/* PAGE HEADING */}
          <header className="device-page-heading">
            <div>
              <h1>Device Control</h1>
              <p>
                Manage your garden's automated watering system, micro-sprinklers, and actuator mechanisms.
              </p>
            </div>

            <div className="device-heading-actions">
              <button
                className="device-header-button"
                type="button"
                onClick={loadActuators}
                disabled={loading}
              >
                <RefreshCw size={14} />
                Refresh Actuators
              </button>
            </div>
          </header>

          {/* CONTROLLER NOTICE */}
          <div className={`device-notice ${errorNotice ? "warning-message" : ""}`} role="status">
            {errorNotice ? <AlertTriangle size={16} color="#e11d48" /> : <Info size={16} />}
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
                  System online. {actuators.length} registered hardware actuators ready for polling &amp; execution.
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
            {actuators.map((actuator) => {
              const zoneLabel = zoneMap.get(actuator.zone_id) || `Zone (${actuator.zone_id.slice(0, 8)}...)`;
              const isSprinkler = actuator.type === "sprinkler";
              const lastAction = actuator.last_action;
              const isBusy = actionLoadingId === actuator.id;

              return (
                <article className="device-control-card watering-card" key={actuator.id}>
                  <div className="device-card-content">
                    <div className="device-card-heading">
                      <div className="device-card-icon watering-icon">
                        {isSprinkler ? <Droplet size={23} /> : <Wind size={23} />}
                      </div>

                      <div className="device-card-title">
                        <span>{actuator.driver.toUpperCase()} DRIVER • {zoneLabel}</span>
                        <h2>{isSprinkler ? "Automatic Watering System" : `${actuator.type.toUpperCase()} Actuator`}</h2>
                      </div>

                      <span className="device-state-badge active-badge">
                        <i />
                        {lastAction ? `Last: ${lastAction.status}` : "Standby"}
                      </span>
                    </div>

                    <div className="device-card-divider" />

                    {/* AUTOMATION MODE */}
                    <div className="automation-control">
                      <div>
                        <strong>Automation Mode</strong>
                        <span>Deterministic AI &amp; soil threshold triggers</span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={automationEnabled}
                        aria-label="Toggle automation mode"
                        className={`device-toggle ${automationEnabled ? "enabled" : ""}`}
                        onClick={() => {
                          const nextValue = !automationEnabled;
                          setAutomationEnabled(nextValue);
                          setNotice(
                            nextValue
                              ? "Automation mode enabled. Microclimate threshold actions active."
                              : "Automation mode paused. Actuator commands now require manual triggers."
                          );
                        }}
                      >
                        <span>{automationEnabled ? <CheckCircle2 size={16} /> : null}</span>
                      </button>
                    </div>

                    {/* METRICS & LIMITS */}
                    <div className="watering-metrics">
                      <div>
                        <span>Max On Duration</span>
                        <strong>{actuator.max_on_seconds}s (Safety Cap)</strong>
                      </div>

                      <div>
                        <span>Min Cooldown</span>
                        <strong>{actuator.min_interval_minutes} mins</strong>
                      </div>

                      <div>
                        <span>Last Action</span>
                        <strong>
                          {lastAction
                            ? `${lastAction.command} (${lastAction.source})`
                            : "None recorded"}
                        </strong>
                      </div>
                    </div>

                    {/* LAST ACTION TIMESTAMP */}
                    {lastAction && (
                      <div style={{ fontSize: "12px", color: "#64748b", margin: "8px 0" }}>
                        Executed: {lastAction.executed_at ? formatDateTime(lastAction.executed_at) : "Pending polling"}
                      </div>
                    )}

                    {/* MANUAL TRIGGER ACTIONS */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        className="device-watering-button"
                        type="button"
                        onClick={() => handleCommand(actuator.id, "turn_on", durationSeconds)}
                        disabled={isBusy}
                        style={{ flex: 2 }}
                      >
                        <Timer size={17} />
                        {isBusy ? "Queuing Command..." : `Trigger ${durationSeconds}s ${isSprinkler ? "Watering" : "On"}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCommand(actuator.id, "turn_off", 1)}
                        disabled={isBusy}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        Turn Off
                      </button>
                    </div>

                    {/* DURATION SELECTOR */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Duration:</span>
                      {[15, 30, 45, Math.min(60, actuator.max_on_seconds)].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setDurationSeconds(sec)}
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #cbd5e1",
                            background: durationSeconds === sec ? "#28452e" : "#fff",
                            color: durationSeconds === sec ? "#fff" : "#475569",
                            cursor: "pointer",
                          }}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
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
                      <span>Polling: <strong>Every 30s</strong></span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {actuators.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <ShieldCheck size={36} color="#64748b" style={{ margin: "0 auto 12px" }} />
              <h2 style={{ fontSize: "16px", color: "#1e293b", marginBottom: "6px" }}>No Hardware Actuators Found</h2>
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                There are no actuators configured for your rooftop garden zones. Run seed or register an actuator via the API.
              </p>
            </div>
          )}

          {/* SAFETY INTERLOCK */}
          <section className="device-safety-card">
            <div className="device-safety-icon">
              <ShieldCheck size={23} />
            </div>

            <div className="device-safety-text">
              <h3>Safety Interlock &amp; Controller Fail-Safe Protection</h3>
              <p>
                Actuator durations are strictly capped by hardware safety timeouts (max 60s hard cap) and enforced minimum cooldown intervals.
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
