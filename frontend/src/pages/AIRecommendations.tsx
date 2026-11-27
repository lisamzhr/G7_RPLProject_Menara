import React, { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Check,
  RefreshCw,
  Building2,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
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
    gardens,
    selectedGarden,
    setSelectedGarden,
  } = useGarden();

  const [recommendations, setRecommendations] =
    useState<RecommendationItem[]>([]);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [alertFilter, setAlertFilter] = useState<"active" | "all">("active");

  const [loading, setLoading] = useState(false);

  const [evaluating, setEvaluating] = useState(false);

  const [statusNotice, setStatusNotice] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [showGardenMenu, setShowGardenMenu] = useState(false);

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

  // =========================================================
  // LOAD ADVISORIES
  // Existing backend integration is preserved
  // =========================================================

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

  // =========================================================
  // RUN AI EVALUATION
  // Existing backend integration is preserved
  // =========================================================

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setErrorMessage("");
    setStatusNotice("");

    try {
      if (selectedZone) {
        // Evaluate single selected zone
        await api.evaluateZone(selectedZone.id);

        setStatusNotice(
          `AI microclimate evaluation completed for ${selectedZone.label}.`
        );
      } else if (zones.length > 0) {
        // Evaluate all zones in garden with Promise.allSettled
        const results = await Promise.allSettled(
          zones.map((z) => api.evaluateZone(z.id))
        );

        const fulfilled = results.filter(
          (r) => r.status === "fulfilled"
        ).length;

        const cooldown = results.filter(
          (r) =>
            r.status === "rejected" &&
            String(r.reason).includes("429")
        ).length;

        if (fulfilled > 0) {
          setStatusNotice(
            `Evaluated ${fulfilled} zone${fulfilled > 1 ? "s" : ""}.${
              cooldown > 0
                ? ` (${cooldown} zone${
                    cooldown > 1 ? "s" : ""
                  } in 60s cooldown)`
                : ""
            }`
          );
        } else if (cooldown > 0) {
          setStatusNotice(
            "Zones were recently evaluated and are in active 60s cooldown."
          );
        }
      } else {
        setErrorMessage("No plant zones available to evaluate.");
      }

      await loadAdvisories();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to run AI evaluation."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // =========================================================
  // CONFIRM ALERT
  // Existing backend integration is preserved
  // =========================================================

  const handleConfirmAlert = async (alertId: string) => {
    try {
      await api.confirmAlert(
        alertId,
        "Confirmed by user on AI Recommendations page"
      );

      setStatusNotice(
        "Alert confirmed. Automated microclimate action queued."
      );

      await loadAdvisories();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to confirm alert."
      );
    }
  };

  // =========================================================
  // OVERRIDE / DISMISS ALERT
  // Existing backend integration is preserved
  // =========================================================

  const handleOverrideAlert = async (alertId: string) => {
    try {
      await api.overrideAlert(
        alertId,
        "Overridden by user on AI Recommendations page"
      );

      setStatusNotice("Alert overridden and marked resolved.");

      await loadAdvisories();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to override alert."
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="ai-container">

      {/* ===================================================
          PAGE HERO
          =================================================== */}

      <section className="ai-hero">
        <div className="ai-hero-main">

          {/* LEFT: TITLE + DESCRIPTION */}

          <div className="ai-hero-title">

            <h1>
              AI Recommendations & Alerts
              <span className="ai-telemetry-badge">
                <Sparkles size={12} />
                AI ADVISORY
              </span>
            </h1>

            <p>
              Autonomous agronomical care advisories synthesized
              from real-time microclimate sensors, botanical
              threshold models, and BMKG predictive forecasts.
            </p>
          </div>

          {/* RIGHT: CONNECTION + GARDEN SELECTOR */}

          <div className="ai-hero-controls">

            {/* CONNECTION STATUS */}

            <div
              className={`ai-hero-sync ${
                loading || evaluating ? "loading" : ""
              }`}
            >
              <RefreshCw
                size={14}
                className={
                  loading || evaluating
                    ? "ai-spin"
                    : ""
                }
              />

              <span>
                {loading
                  ? "Syncing..."
                  : evaluating
                  ? "Evaluating..."
                  : "Connected"}
              </span>
            </div>

            {/* GARDEN SELECTOR */}

            <div className="ai-hero-garden-selector">

              <button
                type="button"
                className="ai-hero-garden-button"
                onClick={() =>
                  setShowGardenMenu((prev) => !prev)
                }
                aria-expanded={showGardenMenu}
              >

                <Building2 size={18} />

                <div className="ai-hero-garden-info">

                  <strong>
                    {selectedGarden?.name ||
                      "Select Garden"}
                  </strong>

                  <small>
                    {selectedGarden?.location_name ||
                      "Garden location"}
                  </small>

                </div>

                <ChevronDown
                  size={16}
                  className={
                    showGardenMenu ? "rotated" : ""
                  }
                />

              </button>

              {/* DROPDOWN */}

              {showGardenMenu && (
                <div className="ai-hero-garden-dropdown">

                  <div className="ai-dropdown-label">
                    SWITCH GARDEN FACILITY
                  </div>

                  {gardens.map((garden) => (
                    <button
                      type="button"
                      key={garden.id}
                      className={`ai-hero-garden-option ${
                        selectedGarden?.id === garden.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedGarden(garden);
                        setShowGardenMenu(false);
                      }}
                    >

                      <strong>
                        {garden.name}
                      </strong>

                      <small>
                        {garden.location_name}
                        {garden.elevation_m != null
                          ? ` • ${garden.elevation_m}m`
                          : ""}
                      </small>

                    </button>
                  ))}

                  {gardens.length === 0 && (
                    <div className="ai-garden-empty">
                      No gardens found.
                    </div>
                  )}

                  <div className="ai-dropdown-bottom">

                    <Link
                      to="/garden-profile"
                      onClick={() =>
                        setShowGardenMenu(false)
                      }
                    >
                      <Plus size={15} />
                      Add New Garden Facility
                    </Link>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* ===================================================
          STATUS & ERROR BANNERS
          =================================================== */}

      {statusNotice && (
        <div className="ai-status-notice">

          <CheckCircle2 size={16} />

          <span>
            {statusNotice}
          </span>

        </div>
      )}

      {errorMessage && (
        <div className="ai-error-notice">

          <AlertTriangle size={16} />

          <span>
            {errorMessage}
          </span>

        </div>
      )}

      {/* ===================================================
          ZONE CONTROLS + EVALUATION
          =================================================== */}

      <div className="ai-controls-strip">

        <div className="ai-zone-controls">

          <div className="ai-controls-label">
            MICROCLIMATE ZONES
          </div>

          <div className="zone-chips">

            <button
              type="button"
              className={`zone-chip ${
                selectedZone === null ? "active" : ""
              }`}
              onClick={() => setSelectedZone(null)}
            >
              All Plant Zones
            </button>

            {zones.map((zone) => (
              <button
                type="button"
                key={zone.id}
                className={`zone-chip ${
                  selectedZone?.id === zone.id
                    ? "active"
                    : ""
                }`}
                onClick={() => setSelectedZone(zone)}
              >
                {zone.label}
              </button>
            ))}

          </div>

        </div>

        <div className="ai-controls-actions">

          <div className="ai-data-count">

            <span>
              {alerts.length} Alert
              {alerts.length === 1 ? "" : "s"}
            </span>

            <span className="ai-count-divider">
              /
            </span>

            <span>
              {recommendations.length} Recommendation
              {recommendations.length === 1 ? "" : "s"}
            </span>

          </div>

          <button
            type="button"
            className="ai-evaluate-button"
            onClick={handleRunEvaluation}
            disabled={evaluating || zones.length === 0}
          >

            <Sparkles size={15} />

            <span>
              {evaluating
                ? "Evaluating..."
                : selectedZone
                ? `Evaluate ${selectedZone.label}`
                : "Run AI Evaluation"}
            </span>

          </button>

        </div>

      </div>

      {/* ===================================================
          ACTIVE ALERTS
          =================================================== */}

      {alerts.length > 0 && (
        <section className="ai-alerts-section">

          <div className="ai-section-heading">

            <div className="ai-section-title">

              <div className="ai-section-icon alert-icon">
                <AlertTriangle size={17} />
              </div>

              <div>

                <h2>
                  Microclimate Alerts
                </h2>

                <p>
                  Alerts requiring attention across
                  your rooftop garden.
                </p>

              </div>

            </div>

            <div className="ai-alert-filter">

              <button
                type="button"
                className={`ai-filter-button ${
                  alertFilter === "active"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setAlertFilter("active")
                }
              >
                Active Only
              </button>

              <button
                type="button"
                className={`ai-filter-button ${
                  alertFilter === "all"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setAlertFilter("all")
                }
              >
                Include Resolved
              </button>

            </div>

          </div>

          <div className="ai-alerts-grid">

            {alerts.map((alert) => {

              const zoneLabel =
                alert.zone_label ||
                zoneMap.get(alert.zone_id) ||
                "Zone Alert";

              const isResolved =
                alert.resolved_at !== null;

              return (
                <article
                  key={alert.id}
                  className={`ai-alert-card ${
                    isResolved ? "resolved" : ""
                  }`}
                >

                  <div className="ai-alert-top">

                    <span className="ai-alert-type">
                      {alert.type}
                    </span>

                    <span className="ai-alert-time">
                      {formatDateTime(alert.created_at)}
                    </span>

                  </div>

                  <div className="ai-alert-zone">
                    {zoneLabel}
                  </div>

                  <p className="ai-alert-message">
                    {alert.message}
                  </p>

                  {!isResolved ? (

                    <div className="ai-alert-actions">

                      <button
                        type="button"
                        className="ai-btn-confirm"
                        onClick={() =>
                          handleConfirmAlert(alert.id)
                        }
                      >

                        <Check size={14} />

                        <span>
                          Confirm & Run Action
                        </span>

                      </button>

                      <button
                        type="button"
                        className="ai-btn-override"
                        onClick={() =>
                          handleOverrideAlert(alert.id)
                        }
                      >
                        Dismiss / Override
                      </button>

                    </div>

                  ) : (

                    <div className="ai-resolved-label">

                      <CheckCircle2 size={13} />

                      <span>
                        Resolved
                      </span>

                    </div>

                  )}

                </article>
              );
            })}

          </div>

        </section>
      )}

      {/* ===================================================
          AI RECOMMENDATIONS
          =================================================== */}

      <section className="ai-rec-section">

        <div className="ai-section-heading">

          <div className="ai-section-title">

            <div className="ai-section-icon rec-icon">
              <Sparkles size={17} />
            </div>

            <div>

              <h2>
                Synthesized Agronomical Recommendations
              </h2>

              <p>
                AI-generated interventions based on
                current garden telemetry.
              </p>

            </div>

          </div>

          <span className="ai-advisory-count">
            Showing {recommendations.length}{" "}
            {recommendations.length === 1
              ? "advisory"
              : "advisories"}
          </span>

        </div>

        {/* EMPTY STATE */}

        {recommendations.length === 0 &&
        alerts.length === 0 &&
        !loading ? (

          <div className="ai-empty-state">

            <div className="ai-empty-icon">
              <CheckCircle2 size={34} />
            </div>

            <h3>
              All Microclimates Optimal
            </h3>

            <p>
              Telemetry across all active plant zones
              complies with botanical thresholds.
              No automated interventions required.
            </p>

            <button
              type="button"
              className="ai-evaluate-button"
              onClick={handleRunEvaluation}
              disabled={evaluating}
            >

              <Sparkles size={15} />

              <span>
                {evaluating
                  ? "Evaluating..."
                  : "Run AI Evaluation Now"}
              </span>

            </button>

          </div>

        ) : (

          <div className="ai-rec-grid">

            {recommendations.map((rec) => {

              const zoneLabel =
                zoneMap.get(rec.zone_id) ||
                "Plant Zone";

              const priorityClass =
                rec.status_level === "warning"
                  ? "warning"
                  : rec.status_level === "advisory"
                  ? "advisory"
                  : "optimal";

              return (
                <article
                  key={rec.id}
                  className="ai-rec-card"
                >

                  {/* CARD TOP */}

                  <div className="ai-rec-card-top">

                    <span className="ai-rec-zone-badge">
                      {zoneLabel}
                    </span>

                    <span
                      className={`ai-priority-badge ${priorityClass}`}
                    >

                      <span className="ai-priority-dot" />

                      {rec.status_level}

                    </span>

                  </div>

                  {/* RECOMMENDATION */}

                  <div className="ai-rec-content">
                    <p className="ai-rec-message">
                      {rec.message.startsWith("Warning:") ? (
                        <>
                          <strong>Warning:</strong>
                          {rec.message.slice("Warning:".length)}
                        </>
                      ) : (
                        rec.message
                      )}
                    </p>
                  </div>

                  {/* DIAGNOSTIC REASONS */}

                  {rec.reasons &&
                    rec.reasons.length > 0 && (

                    <div className="ai-reasons-container">

                      <div className="ai-reasons-heading">
                        <span>
                          OBSERVATION REASON
                        </span>
                      </div>

                      {rec.reasons.map(
                        (reason, idx) => (

                          <div
                            key={idx}
                            className="ai-reason-pill"
                          >

                            <Info
                              size={13}
                              className="ai-reason-icon"
                            />

                            <span>
                              {reason}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  )}

                  {/* EVALUATION TIME */}

                  <div className="ai-rec-footer">

                    <Clock size={13} />

                    <span>
                      Evaluated:{" "}
                      {formatDateTime(rec.created_at)}
                    </span>

                  </div>

                </article>
              );
            })}

          </div>

        )}

      </section>

      {/* ===================================================
          FOOTER NOTICE
          =================================================== */}

      <div className="ai-notice-banner">

        <Info size={16} />

        <p>
          <strong>Notice:</strong> Automated
          suggestions synthesize sensor data and BMKG
          predictive radar models. Verify physical field
          conditions before triggering major automated
          adjustments.
        </p>

      </div>

      {/* ===================================================
          PAGE FOOTER
          =================================================== */}

      <footer className="ai-page-footer">

        <span>
          © 2026 MENARA. Monitoring Environment for
          AI Rooftop Agriculture.
        </span>

      </footer>

    </div>
  );
};

export default AIRecommendations;