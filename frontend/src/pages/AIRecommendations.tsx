import { useCallback, useEffect, useState } from "react";
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
  Droplet,
  Sun,
  CheckCircle2,
  Building2,
  Info,
  Sparkles,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { formatDateTime } from "../lib/format";
import type { AlertItem, Garden, PlantZone, RecommendationItem } from "../types";
import "../styles/ai-recommendations.css";

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

export const AIRecommendations = () => {
  const navigate = useNavigate();

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<PlantZone | null>(null);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [notice, setNotice] = useState(
    "Automated suggestions synthesize real-time sensor metrics and BMKG weather data. Verify conditions before triggering major adjustments."
  );
  const [lastAction, setLastAction] = useState("");
  const [error, setError] = useState("");
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

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError("");
        const gardensData = await api.getGardens();
        if (!isMounted) return;
        setGardens(gardensData);
        if (gardensData.length > 0) {
          setSelectedGarden(gardensData[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load gardens.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected garden changes, load zones
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
        console.error("Failed to load zones:", err);
      }
    };
    loadZones();
    return () => {
      isMounted = false;
    };
  }, [selectedGarden]);

  // Load recommendations and alerts
  const loadAdvisories = useCallback(async () => {
    try {
      setLoading(true);
      const zoneId = selectedZone?.id;
      const [recsData, alertsData] = await Promise.all([
        api.getRecommendations(zoneId),
        api.getAlerts({ zoneId, status: "active" }),
      ]);
      setRecommendations(recsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error("Failed to load recommendations/alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    loadAdvisories();
  }, [loadAdvisories]);

  const handleRunEvaluation = async () => {
    if (!selectedZone) {
      setError("Please select a plant zone to evaluate.");
      return;
    }
    try {
      setEvaluating(true);
      setError("");
      await api.evaluateZone(selectedZone.id);
      setNotice(`AI evaluation completed successfully for ${selectedZone.label}.`);
      setLastAction("Zone Evaluation");
      await loadAdvisories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleConfirmAlert = async (alertId: string) => {
    try {
      await api.confirmAlert(alertId, "Confirmed by user on AI Recommendations page");
      setLastAction("Confirmed Alert & Queued Action");
      setNotice("Alert confirmed. Control action has been queued for execution.");
      await loadAdvisories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm alert.");
    }
  };

  const handleOverrideAlert = async (alertId: string) => {
    try {
      await api.overrideAlert(alertId, "Overridden by user on AI Recommendations page");
      setLastAction("Overrode Alert");
      setNotice("Alert overridden and resolved.");
      await loadAdvisories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to override alert.");
    }
  };

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

  return (
    <div className="ai-recommendations-page">
      {/* SIDEBAR */}
      <aside className="ai-sidebar">
        <div className="ai-brand">
          <div className="ai-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="ai-brand-text">
            <h2>
              MENARA <span />
            </h2>
            <p>ROOFTOP AGRITECH</p>
          </div>
        </div>

        <nav className="ai-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `ai-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={21} strokeWidth={2.2} />

                <span>{item.label}</span>

                {item.tag && (
                  <span className="ai-nav-tag">{item.tag}</span>
                )}

                {item.path === "/recommendations" && (
                  <span className="ai-nav-indicator" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="ai-sidebar-bottom">
          <div className="ai-online-status">
            <span />
            <span>Online • Node Mesh</span>
            <Radio size={17} />
          </div>

          <div className="ai-user-profile">
            <div className="ai-user-avatar">
              <UserRound size={22} />
            </div>

            <div className="ai-user-info">
              <strong title={userName}>{userName}</strong>
              <span>{userRole}</span>
            </div>

            <button
              className="ai-more-button"
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
      <main className="ai-main">
        <div className="ai-content">
          {/* TOP BAR */}
          <div className="ai-topbar">
            <div className="ai-location-pill" style={{ position: "relative" }}>
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
                <span>/ {selectedZone?.label || "All Zones"}</span>
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

            <div className="ai-sync-pill">
              <RefreshCw size={12} className={loading ? "spin" : ""} />
              {loading ? "Syncing..." : "Synced Live"}
            </div>

            <div className="ai-evaluation">
              <Clock size={14} />
              <span>Active Items:</span>
              <i />
              <strong>{recommendations.length + alerts.length} Items</strong>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", margin: "12px 0" }}>
              {error}
            </div>
          )}

          {/* HEADING */}
          <header className="ai-page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>AI Recommendations</h1>
              <p>
                Real-time automated agronomical care interventions synthesized from live microclimate telemetry, sensor nodes, and BMKG predictive data.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunEvaluation}
              disabled={evaluating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#28452e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: evaluating ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <Sparkles size={16} />
              {evaluating ? "Evaluating Zone..." : "Run AI Evaluation"}
            </button>
          </header>

          {/* ZONE FILTER CHIPS */}
          {zones.length > 1 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setSelectedZone(null)}
                style={{
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: selectedZone === null ? "#28452e" : "#fff",
                  color: selectedZone === null ? "#fff" : "#475569",
                  cursor: "pointer",
                }}
              >
                All Zones
              </button>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZone(z)}
                  style={{
                    fontSize: "12px",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: selectedZone?.id === z.id ? "#28452e" : "#fff",
                    color: selectedZone?.id === z.id ? "#fff" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          )}

          {/* ACTIVE ALERTS REQUIRING CONFIRMATION */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#991b1b", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={18} />
                Action Confirmation Required ({alerts.length})
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {alerts.map((alert) => (
                  <article
                    key={alert.id}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #fca5a5",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: "4px" }}>
                        {alert.type}
                      </span>
                      <small style={{ color: "#64748b", fontSize: "11px" }}>{formatDateTime(alert.created_at)}</small>
                    </div>
                    <strong style={{ display: "block", color: "#1e293b", fontSize: "14px", marginBottom: "4px" }}>
                      {alert.zone_label || zoneMap.get(alert.zone_id) || "Zone Alert"}
                    </strong>
                    <p style={{ color: "#475569", fontSize: "13px", lineHeight: "1.4", marginBottom: "14px" }}>
                      {alert.message}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleConfirmAlert(alert.id)}
                        style={{
                          flex: 1,
                          background: "#15803d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Confirm &amp; Run
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOverrideAlert(alert.id)}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "8px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Dismiss / Override
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* RECOMMENDATION CARDS */}
          <section className="ai-recommendation-grid">
            {recommendations.map((recommendation) => {
              const isWarning = recommendation.status_level === "warning";
              const isAdvisory = recommendation.status_level === "advisory";
              const zoneLabel = zoneMap.get(recommendation.zone_id) || "Zone Recommendation";

              return (
                <article
                  className="ai-recommendation-card"
                  key={recommendation.id}
                >
                  {/* CARD HEADER */}
                  <div className="ai-card-heading">
                    <div className="ai-card-icon climate">
                      {isWarning ? <Sun size={21} /> : <Droplet size={21} />}
                    </div>

                    <div className="ai-card-title">
                      <span className="ai-category climate">
                        {zoneLabel}
                      </span>
                      <h2>{recommendation.message.slice(0, 48)}...</h2>
                    </div>

                    <span
                      className={`ai-priority ${isWarning ? "high" : isAdvisory ? "medium" : "advisory"}`}
                    >
                      <i />
                      {isWarning ? "Warning" : isAdvisory ? "Advisory" : "Normal"}
                    </span>
                  </div>

                  {/* SENSOR METRICS / REASONS */}
                  <div className="ai-card-metrics">
                    {recommendation.reasons.map((reason, index) => (
                      <div className="ai-metric-pill" key={index}>
                        <Info size={13} />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* FULL RECOMMENDATION MESSAGE */}
                  <div className="ai-information-box">
                    <h3>ADVISORY DETAILS</h3>
                    <p>{recommendation.message}</p>
                  </div>

                  <div className="ai-action-box">
                    <h3>EVALUATION TIMESTAMP</h3>
                    <p>{formatDateTime(recommendation.created_at)}</p>
                  </div>

                  {/* BUTTONS */}
                  <div className="ai-card-actions">
                    <button
                      className="ai-primary-button"
                      type="button"
                      onClick={() => {
                        setLastAction(`Acknowledged recommendation for ${zoneLabel}`);
                        setNotice(`Recommendation noted for ${zoneLabel}.`);
                      }}
                    >
                      <CheckCircle2 size={15} />
                      Acknowledge
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* EMPTY STATE */}
          {recommendations.length === 0 && alerts.length === 0 && !loading && (
            <div className="ai-empty-state">
              <CheckCircle2 size={34} />
              <h2>All recommendations up to date</h2>
              <p>There are currently no active alerts or advisories for this selection.</p>
              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={evaluating}
              >
                {evaluating ? "Evaluating..." : "Run AI Evaluation Now"}
              </button>
            </div>
          )}

          {/* NOTICE */}
          <div className="ai-notice">
            <Info size={17} />
            <p>
              <strong>Notice:</strong> {notice}
              {lastAction && (
                <span className="ai-last-action">
                  {" "}Last action: {lastAction}.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="ai-footer">
          <span className="ai-footer-dots">•••</span>
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </footer>
      </main>
    </div>
  );
};

export default AIRecommendations;
