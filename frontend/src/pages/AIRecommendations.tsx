import React, { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Check,
} from "lucide-react";
import { useGarden } from "../context/GardenContext";
import { api } from "../api/client";
import { formatDateTime } from "../lib/format";
import type { AlertItem, RecommendationItem } from "../types";
import "../styles/ai-recommendations.css";

export const AIRecommendations: React.FC = () => {
  const {
    zones,
    selectedZone,
    setSelectedZone,
  } = useGarden();

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertFilter, setAlertFilter] = useState<"active" | "all">("active");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

  // Load advisories (recommendations & alerts)
  const loadAdvisories = useCallback(async () => {
    try {
      setLoading(true);
      const zoneId = selectedZone?.id;
      const [recsData, alertsData] = await Promise.all([
        api.getRecommendations(zoneId),
        api.getAlerts({
          zoneId,
          status: alertFilter === "active" ? "active" : undefined,
        }),
      ]);
      setRecommendations(recsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error("Failed to load recommendations/alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedZone, alertFilter]);

  useEffect(() => {
    loadAdvisories();
  }, [loadAdvisories]);

  // Handle Run AI Evaluation
  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setErrorMessage("");
    setStatusNotice("");

    try {
      if (selectedZone) {
        // Evaluate single selected zone
        await api.evaluateZone(selectedZone.id);
        setStatusNotice(`AI microclimate evaluation completed for ${selectedZone.label}.`);
      } else if (zones.length > 0) {
        // Evaluate all zones in garden with Promise.allSettled
        const results = await Promise.allSettled(
          zones.map((z) => api.evaluateZone(z.id))
        );
        const fulfilled = results.filter((r) => r.status === "fulfilled").length;
        const cooldown = results.filter(
          (r) => r.status === "rejected" && String(r.reason).includes("429")
        ).length;

        if (fulfilled > 0) {
          setStatusNotice(
            `Evaluated ${fulfilled} zone${fulfilled > 1 ? "s" : ""}.${
              cooldown > 0 ? ` (${cooldown} zone${cooldown > 1 ? "s" : ""} in 60s cooldown)` : ""
            }`
          );
        } else if (cooldown > 0) {
          setStatusNotice("Zones were recently evaluated and are in active 60s cooldown.");
        }
      } else {
        setErrorMessage("No plant zones available to evaluate.");
      }
      await loadAdvisories();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to run AI evaluation."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Confirm Alert
  const handleConfirmAlert = async (alertId: string) => {
    try {
      await api.confirmAlert(alertId, "Confirmed by user on AI Recommendations page");
      setStatusNotice("Alert confirmed. Automated microclimate action queued.");
      await loadAdvisories();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to confirm alert.");
    }
  };

  // Override / Dismiss Alert
  const handleOverrideAlert = async (alertId: string) => {
    try {
      await api.overrideAlert(alertId, "Overridden by user on AI Recommendations page");
      setStatusNotice("Alert overridden and marked resolved.");
      await loadAdvisories();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to override alert.");
    }
  };

  return (
    <div className="ai-container">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>AI Recommendations &amp; Alerts</h1>
          <p>
            Autonomous agronomical care advisories synthesized from real-time microclimate sensors, botanical threshold models, and BMKG predictive forecasts.
          </p>
        </div>

        <button
          type="button"
          className="app-btn-primary"
          onClick={handleRunEvaluation}
          disabled={evaluating || zones.length === 0}
        >
          <Sparkles size={16} />
          <span>{evaluating ? "Evaluating..." : selectedZone ? `Evaluate ${selectedZone.label}` : "Run AI Evaluation (All Zones)"}</span>
        </button>
      </div>

      {/* STATUS & ERROR BANNERS */}
      {statusNotice && (
        <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", fontSize: "13px" }}>
          {statusNotice}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", fontSize: "13px" }}>
          {errorMessage}
        </div>
      )}

      {/* CONTROLS STRIP (ZONE CHIPS & STATS) */}
      <div className="ai-controls-strip">
        <div className="zone-chips" style={{ margin: 0 }}>
          <button
            type="button"
            className={`zone-chip ${selectedZone === null ? "active" : ""}`}
            onClick={() => setSelectedZone(null)}
          >
            All Plant Zones
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              className={`zone-chip ${selectedZone?.id === zone.id ? "active" : ""}`}
              onClick={() => setSelectedZone(zone)}
            >
              {zone.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {alerts.length} Alert{alerts.length === 1 ? "" : "s"} • {recommendations.length} Recommendation{recommendations.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* ACTIVE ALERTS REQUIRING ATTENTION */}
      {alerts.length > 0 && (
        <section className="ai-alerts-section">
          <div className="ai-alerts-header">
            <h2>
              <AlertTriangle size={18} />
              <span>Microclimate Alerts Requiring Action ({alerts.length})</span>
            </h2>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className={`app-btn-secondary ${alertFilter === "active" ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}
                onClick={() => setAlertFilter("active")}
              >
                Active Only
              </button>
              <button
                type="button"
                className={`app-btn-secondary ${alertFilter === "all" ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}
                onClick={() => setAlertFilter("all")}
              >
                Include Resolved
              </button>
            </div>
          </div>

          <div className="ai-alerts-grid">
            {alerts.map((alert) => {
              const zoneLabel = alert.zone_label || zoneMap.get(alert.zone_id) || "Zone Alert";
              const isResolved = alert.resolved_at !== null;

              return (
                <article key={alert.id} className="ai-alert-card">
                  <div className="ai-alert-top">
                    <span className="ai-alert-type">{alert.type}</span>
                    <span className="ai-alert-time">{formatDateTime(alert.created_at)}</span>
                  </div>

                  <strong>{zoneLabel}</strong>
                  <p>{alert.message}</p>

                  {!isResolved ? (
                    <div className="ai-alert-actions">
                      <button
                        type="button"
                        className="ai-btn-confirm"
                        onClick={() => handleConfirmAlert(alert.id)}
                      >
                        <Check size={14} />
                        <span>Confirm &amp; Run Action</span>
                      </button>
                      <button
                        type="button"
                        className="ai-btn-override"
                        onClick={() => handleOverrideAlert(alert.id)}
                      >
                        <span>Dismiss / Override</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} />
                      <span>Resolved</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* RECOMMENDATIONS SECTION */}
      <section className="ai-rec-section">
        <div className="ai-rec-header">
          <h2>Synthesized Agronomical Recommendations</h2>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Showing {recommendations.length} {recommendations.length === 1 ? "advisory" : "advisories"}
          </span>
        </div>

        {recommendations.length === 0 && alerts.length === 0 && !loading ? (
          <div className="ai-empty-state">
            <CheckCircle2 size={40} />
            <h3>All Microclimates Optimal</h3>
            <p>
              Telemetry across all active plant zones complies with botanical thresholds. No automated interventions required.
            </p>
            <button
              type="button"
              className="app-btn-primary"
              style={{ margin: "0 auto" }}
              onClick={handleRunEvaluation}
              disabled={evaluating}
            >
              <Sparkles size={15} />
              <span>{evaluating ? "Evaluating..." : "Run AI Evaluation Now"}</span>
            </button>
          </div>
        ) : (
          <div className="ai-rec-grid">
            {recommendations.map((rec) => {
              const zoneLabel = zoneMap.get(rec.zone_id) || "Plant Zone";
              const priorityClass =
                rec.status_level === "warning"
                  ? "warning"
                  : rec.status_level === "advisory"
                  ? "advisory"
                  : "optimal";

              return (
                <article key={rec.id} className="ai-rec-card">
                  <div className="ai-rec-card-top">
                    <span className="ai-rec-zone-badge">{zoneLabel}</span>
                    <span className={`ai-priority-badge ${priorityClass}`}>
                      {rec.status_level}
                    </span>
                  </div>

                  <p className="ai-rec-message">{rec.message}</p>

                  {/* Diagnostic Trigger Reasons */}
                  {rec.reasons && rec.reasons.length > 0 && (
                    <div className="ai-reasons-container">
                      {rec.reasons.map((reason, idx) => (
                        <div key={idx} className="ai-reason-pill">
                          <Info size={13} color="#2b4f35" style={{ flexShrink: 0, marginTop: "2px" }} />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="ai-rec-footer">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} />
                      Evaluated: {formatDateTime(rec.created_at)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default AIRecommendations;
