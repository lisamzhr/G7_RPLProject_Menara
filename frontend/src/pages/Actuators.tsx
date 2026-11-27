import React, { useEffect, useState, useCallback } from "react";
import {
  Radio,
  RefreshCw,
  Droplet,
  SunMedium,
  Wind,
  ShieldCheck,
  Timer,
  AlertTriangle,
  Info,
  Layers,
  Plus,
  Trash2,
  Cpu,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useGarden } from "../context/GardenContext";
import { formatDateTime } from "../lib/format";
import type { ActuatorItem, SensorNodeItem } from "../types";
import "../styles/actuators.css";

export const Actuators: React.FC = () => {
  const {
    selectedGarden,
    gardens,
    setSelectedGarden,
    zones,
    selectedZone,
    setSelectedZone,
  } = useGarden();

  const [nodes, setNodes] = useState<SensorNodeItem[]>([]);
  const [actuators, setActuators] = useState<ActuatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cardDurations, setCardDurations] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState(
    "Live hardware status and actuators scoped to selected garden."
  );
  const [errorNotice, setErrorNotice] = useState("");

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerZoneId, setRegisterZoneId] = useState("");
  const [registerMac, setRegisterMac] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // Deletion modal state
  const [nodeToDelete, setNodeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Garden selector
  const [showGardenMenu, setShowGardenMenu] = useState(false);

  // =========================================================
  // LOAD DATA
  // Existing backend integration preserved
  // =========================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorNotice("");

      const zoneId = selectedZone?.id;

      const [nodesData, actuatorsData] = await Promise.all([
        api.getNodes(zoneId),
        api.getActuators(zoneId),
      ]);

      setNodes(nodesData);
      setActuators(actuatorsData);
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : "Failed to load actuators or sensor nodes."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedGarden]);

  // =========================================================
  // ACTUATOR COMMANDS
  // Existing backend integration preserved
  // =========================================================

  const handleCommand = async (
    actuatorId: string,
    command: "turn_on" | "turn_off",
    durationSeconds = 30
  ) => {
    try {
      setActionLoadingId(actuatorId);
      setErrorNotice("");

      const res = await api.commandActuator(
        actuatorId,
        command,
        durationSeconds
      );

      setNotice(
        `Command '${command}' queued successfully (ID: ${res.command_id.slice(
          0,
          8
        )}...). Waiting for node poll.`
      );

      await loadData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send command to actuator.";

      setErrorNotice(msg);
      setNotice(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getCardDuration = (actuator: ActuatorItem) => {
    return (
      cardDurations[actuator.id] ||
      Math.min(30, actuator.max_on_seconds)
    );
  };

  const setCardDuration = (actuatorId: string, seconds: number) => {
    setCardDurations((prev) => ({
      ...prev,
      [actuatorId]: seconds,
    }));
  };

  // =========================================================
  // REGISTER SENSOR NODE
  // Existing backend integration preserved
  // =========================================================

  const openRegisterModal = (zoneIdDefault?: string) => {
    const target =
      zoneIdDefault || selectedZone?.id || zones[0]?.id || "";

    setRegisterZoneId(target);
    setRegisterMac("");
    setRegisterName("");
    setRegisterError("");
    setShowRegisterModal(true);
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerZoneId) {
      setRegisterError("Please select a target plant zone.");
      return;
    }

    if (!registerMac.trim()) {
      setRegisterError("Please enter the ESP32 hardware MAC address.");
      return;
    }

    try {
      setRegisterLoading(true);
      setRegisterError("");

      const res = await api.registerNode(registerZoneId, {
        mac_address: registerMac.trim(),
        name: registerName.trim() || undefined,
      });

      setShowRegisterModal(false);

      setNotice(
        `Sensor node '${res.name || res.id}' registered successfully!`
      );

      await loadData();
    } catch (err) {
      setRegisterError(
        err instanceof Error
          ? err.message
          : "Failed to register sensor node."
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  // =========================================================
  // DELETE SENSOR NODE
  // Existing backend integration preserved
  // =========================================================

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;

    try {
      setDeleteLoading(true);

      await api.deleteNode(nodeToDelete.id);

      setNotice(
        `Sensor node '${nodeToDelete.name}' unlinked successfully.`
      );

      setNodeToDelete(null);
      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to unlink sensor node."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="actuators-container">

      {/* ===================================================
          PAGE HERO
          =================================================== */}

      <section className="actuators-hero">
        <div className="actuators-hero-main">

          {/* LEFT: TITLE + DESCRIPTION */}

          <div className="actuators-hero-title">
            <h1>
              Actuators &amp; Sensor Nodes
              <span className="actuators-telemetry-badge">
                <Radio size={12} />
                HARDWARE CONTROL
              </span>
            </h1>

            <p>
              Monitor connected telemetry nodes and manage
              irrigation, lighting, and climate control
              hardware across your rooftop garden.
            </p>
          </div>

          {/* RIGHT: CONNECTION + GARDEN SELECTOR */}

          <div className="actuators-hero-controls">

            {/* CONNECTION */}

            <div
              className={`actuators-hero-sync ${
                loading ? "loading" : ""
              }`}
            >
              <RefreshCw
                size={14}
                className={loading ? "actuators-spin" : ""}
              />

              <span>
                {loading ? "Syncing..." : "Connected"}
              </span>
            </div>

            {/* GARDEN SELECTOR */}

            <div className="actuators-garden-selector">
              <button
                type="button"
                className="actuators-garden-button"
                onClick={() =>
                  setShowGardenMenu((prev) => !prev)
                }
                aria-expanded={showGardenMenu}
              >
                <Building2 size={18} />

                <div className="actuators-garden-info">
                  <strong>
                    {selectedGarden?.name || "Select Garden"}
                  </strong>

                  <small>
                    {selectedGarden?.location_name ||
                      "Garden location"}
                  </small>
                </div>

                <ChevronDown
                  size={16}
                  className={showGardenMenu ? "rotated" : ""}
                />
              </button>

              {showGardenMenu && (
                <div className="actuators-garden-dropdown">
                  <div className="actuators-dropdown-label">
                    SWITCH GARDEN FACILITY
                  </div>

                  {gardens.map((garden) => (
                    <button
                      type="button"
                      key={garden.id}
                      className={`actuators-garden-option ${
                        selectedGarden?.id === garden.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedGarden(garden);
                        setShowGardenMenu(false);
                      }}
                    >
                      <strong>{garden.name}</strong>

                      <small>
                        {garden.location_name}
                        {garden.elevation_m != null
                          ? ` • ${garden.elevation_m}m`
                          : ""}
                      </small>
                    </button>
                  ))}

                  {gardens.length === 0 && (
                    <div className="actuators-garden-empty">
                      No gardens found.
                    </div>
                  )}

                  <div className="actuators-dropdown-bottom">
                    <Link
                      to="/garden-profile"
                      onClick={() => setShowGardenMenu(false)}
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

        {/* HERO ACTIONS */}

        <div className="actuators-hero-actions">
          <button
            type="button"
            className="actuators-primary-button"
            onClick={() => openRegisterModal()}
          >
            <Plus size={15} />
            Register ESP32 Node
          </button>

          <button
            type="button"
            className="actuators-secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={loading ? "actuators-spin" : ""}
            />
            Refresh Status
          </button>

          {/* INLINE FEEDBACK */}

          <div
            className={`actuators-feedback actuators-inline-info ${
              errorNotice ? "error" : "success"
            }`}
          >
            {errorNotice ? (
              <AlertTriangle size={17} />
            ) : (
              <Info size={17} />
            )}

            <span>{errorNotice || notice}</span>
          </div>
        </div>
      </section>

      {/* ===================================================
          ZONE FILTER
          =================================================== */}

      {zones.length > 1 && (
        <div className="actuators-zone-filter">
          <div className="actuators-zone-filter-label">
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
              All Zones
            </button>

            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                className={`zone-chip ${
                  selectedZone?.id === z.id ? "active" : ""
                }`}
                onClick={() => setSelectedZone(z)}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================
          SECTION 1: SENSOR NODES
          =================================================== */}

      <section className="actuators-section">
        <div className="actuators-section-heading">
          <div className="actuators-section-title">
            <div className="actuators-section-icon">
              <Radio size={18} />
            </div>

            <div>
              <h2>
                Telemetry Sensor Nodes ({nodes.length})
              </h2>

              <p>
                Registered ESP32 hardware and connection status.
              </p>
            </div>
          </div>
        </div>

        {/* EMPTY STATE */}

        {nodes.length === 0 && !loading && (
          <div className="actuators-empty-state">
            <div className="actuators-empty-icon">
              <Layers size={30} />
            </div>

            <h3>No Sensor Nodes Registered</h3>

            <p>
              No sensor nodes registered{" "}
              {selectedZone
                ? `for ${selectedZone.label}`
                : "in this garden"}.
            </p>

            <button
              type="button"
              className="actuators-primary-button"
              onClick={() => openRegisterModal(selectedZone?.id)}
            >
              <Plus size={14} />
              Register ESP32 Node
            </button>
          </div>
        )}

        {/* NODE GRID */}

        {nodes.length > 0 && (
          <div className="actuators-node-grid">
            {nodes.map((node) => {
              const isOnline = node.status === "active";

              const zoneLabel =
                node.zone_label ||
                zoneMap.get(node.zone_id) ||
                node.zone_id.slice(0, 8);

              return (
                <article
                  key={node.id}
                  className="actuators-node-card"
                >
                  {/* NODE HEADER */}

                  <div className="actuators-node-top">
                    <div className="actuators-node-identity">
                      <div
                        className={`actuators-node-indicator ${
                          isOnline ? "online" : "offline"
                        }`}
                      />

                      <strong>
                        {node.name || node.id}
                      </strong>
                    </div>

                    <span
                      className={`actuators-node-status ${
                        isOnline ? "online" : "offline"
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  {/* NODE DETAILS */}

                  <div className="actuators-node-details">
                    <div className="actuators-detail-row">
                      <span>Assigned Zone</span>
                      <strong>{zoneLabel}</strong>
                    </div>

                    {node.mac_address && (
                      <div className="actuators-detail-row">
                        <span>MAC Address</span>
                        <code>{node.mac_address}</code>
                      </div>
                    )}

                    <div className="actuators-detail-row">
                      <span>Hardware ID</span>
                      <code className="hardware-id">{node.id}</code>
                    </div>

                    <div className="actuators-detail-row">
                      <span>Last Heartbeat</span>
                      <strong>
                        {node.last_seen_at
                          ? formatDateTime(node.last_seen_at)
                          : "Never reported"}
                      </strong>
                    </div>
                  </div>
                  {/* NODE FOOTER */}

                  <div className="actuators-node-footer">
                    <button
                      type="button"
                      className="actuators-delete-button"
                      onClick={() =>
                        setNodeToDelete({
                          id: node.id,
                          name: node.name || node.id,
                        })
                      }
                      title="Unlink and unregister sensor node"
                    >
                      <Trash2 size={13} />
                      Unlink Node
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================
          SECTION 2: ACTUATORS
          =================================================== */}

      <section className="actuators-section">
        <div className="actuators-section-heading">
          <div className="actuators-section-title">
            <div className="actuators-section-icon">
              <Droplet size={18} />
            </div>

            <div>
              <h2>
                Irrigation &amp; Climate Actuators ({actuators.length})
              </h2>

              <p>
                Manually control connected hardware and
                configure activation duration.
              </p>
            </div>
          </div>
        </div>

        {/* EMPTY STATE */}

        {actuators.length === 0 && !loading && (
          <div className="actuators-empty-state">
            <div className="actuators-empty-icon">
              <Droplet size={30} />
            </div>

            <h3>No Actuators Found</h3>

            <p>
              There are no actuators mapped to this garden.
              Seed demo data or register an actuator via the backend.
            </p>
          </div>
        )}

        {/* ACTUATOR GRID */}

        {actuators.length > 0 && (
          <div className="actuators-control-grid">
            {actuators.map((actuator) => {
              const isSprinkler =
                actuator.type === "sprinkler";

              const isShade =
                actuator.type === "shade_net";

              const ActIcon = isSprinkler
                ? Droplet
                : isShade
                ? Wind
                : SunMedium;

              const zoneLabel =
                zoneMap.get(actuator.zone_id) ||
                `Zone ${actuator.zone_id.slice(0, 8)}`;

              const lastAction = actuator.last_action;

              const isBusy =
                actionLoadingId === actuator.id;

              const duration =
                getCardDuration(actuator);

              return (
                <article
                  key={actuator.id}
                  className="actuators-control-card"
                >
                  {/* ACTUATOR HEADER */}

                  <div className="actuators-control-top">
                    <div className="actuators-control-identity">
                      <div className="actuators-control-icon">
                        <ActIcon size={21} />
                      </div>

                      <div>
                        <h3>
                          {isSprinkler
                            ? "Zone Irrigation Sprinkler"
                            : isShade
                            ? "Automated Shade Net"
                            : "Supplementary Grow Light"}
                        </h3>

                        <span>
                          Assigned to:{" "}
                          <strong>{zoneLabel}</strong>
                        </span>
                      </div>
                    </div>

                    <span className="actuators-driver-badge">
                      Driver: {actuator.driver}
                    </span>
                  </div>

                  {/* LAST COMMAND */}

                  <div className="actuators-last-action">
                    <div className="actuators-last-action-heading">
                      <span>LAST CONTROL ACTION</span>
                    </div>

                    <div className="actuators-action-row">
                      <span>Last Command</span>

                      <strong>
                        {lastAction
                          ? `${lastAction.command} (${lastAction.source})`
                          : "None"}
                      </strong>
                    </div>

                    <div className="actuators-action-row">
                      <span>Execution State</span>

                      <strong
                        className={`actuators-execution-status ${
                          lastAction?.status || "idle"
                        }`}
                      >
                        {lastAction?.status
                          ? lastAction.status.toUpperCase()
                          : "IDLE"}
                      </strong>
                    </div>

                    {lastAction?.executed_at && (
                      <div className="actuators-action-row">
                        <span>Triggered At</span>

                        <span>
                          {formatDateTime(
                            lastAction.executed_at
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DURATION SLIDER */}

                  <div className="actuators-duration">
                    <div className="actuators-duration-heading">
                      <span>
                        <Timer size={13} />
                        Duration
                      </span>

                      <strong>{duration}s</strong>
                    </div>

                    <input
                      type="range"
                      className="actuators-range"
                      min="5"
                      max={actuator.max_on_seconds}
                      step="5"
                      value={duration}
                      onChange={(e) =>
                        setCardDuration(
                          actuator.id,
                          Number(e.target.value)
                        )
                      }
                      disabled={isBusy}
                    />

                    <div className="actuators-range-labels">
                      <span>5s</span>
                      <span>
                        Max {actuator.max_on_seconds}s
                      </span>
                    </div>
                  </div>

                  {/* MANUAL CONTROL */}

                  <div className="actuators-trigger-actions">
                    <button
                      type="button"
                      className="actuators-trigger-on"
                      onClick={() =>
                        handleCommand(
                          actuator.id,
                          "turn_on",
                          duration
                        )
                      }
                      disabled={isBusy}
                    >
                      {isBusy
                        ? "Queuing..."
                        : `Trigger ${duration}s ${
                            isSprinkler
                              ? "Watering"
                              : "On"
                          }`}
                    </button>

                    <button
                      type="button"
                      className="actuators-trigger-off"
                      onClick={() =>
                        handleCommand(
                          actuator.id,
                          "turn_off",
                          1
                        )
                      }
                      disabled={isBusy}
                    >
                      Turn Off
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* SAFETY NOTICE */}

        <div className="actuators-safety-notice">
          <div className="actuators-safety-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <strong>
              Hardware Safety Interlocks Enforced
            </strong>

            <p>
              Actuator trigger durations are strictly bounded
              by hardware safety limits (maximum 60s hard cap)
              and enforced minimum cooldown intervals.
              Overriding commands requires confirmation to
              protect plants from over-watering.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          REGISTER SENSOR NODE MODAL
          FULL REGISTRATION FUNCTION PRESERVED
          =================================================== */}

      {showRegisterModal && (
        <div
          className="actuators-modal-overlay"
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            className="actuators-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="actuators-modal-heading">
              <div className="actuators-modal-icon">
                <Cpu size={20} />
              </div>

              <h3>
                Register ESP32 Sensor Node
              </h3>
            </div>

            <p className="actuators-modal-description">
              Link a physical ESP32 hardware board to a plant
              zone based on its factory MAC address. Multiple
              sensor nodes can monitor the same zone.
            </p>

            {/* REGISTRATION ERROR */}

            {registerError && (
              <div className="actuators-modal-error">
                <AlertTriangle size={15} />
                <span>{registerError}</span>
              </div>
            )}

            {/* REGISTRATION FORM */}

            <form onSubmit={handleRegisterNode}>
              <div className="actuators-form-group">
                <label>
                  Target Plant Zone *
                </label>

                <select
                  className="actuators-input"
                  value={registerZoneId}
                  onChange={(e) =>
                    setRegisterZoneId(e.target.value)
                  }
                  required
                >
                  {zones.map((z) => (
                    <option
                      key={z.id}
                      value={z.id}
                    >
                      {z.label} ({z.category.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="actuators-form-group">
                <label>
                  ESP32 MAC Address *
                </label>

                <input
                  type="text"
                  className="actuators-input mac-input"
                  placeholder="24:6F:28:XX:YY:ZZ"
                  value={registerMac}
                  onChange={(e) =>
                    setRegisterMac(
                      e.target.value.toUpperCase()
                    )
                  }
                  required
                />

                <small>
                  Retrieved in Arduino via{" "}
                  <code>WiFi.macAddress()</code>.
                </small>
              </div>

              <div className="actuators-form-group">
                <label>
                  Node Friendly Name (Optional)
                </label>

                <input
                  type="text"
                  className="actuators-input"
                  placeholder="e.g., North Bed Hydroponic Sensor"
                  value={registerName}
                  onChange={(e) =>
                    setRegisterName(e.target.value)
                  }
                />
              </div>

              {/* FORM ACTIONS */}

              <div className="actuators-modal-actions">
                <button
                  type="button"
                  className="actuators-modal-cancel"
                  onClick={() =>
                    setShowRegisterModal(false)
                  }
                  disabled={registerLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="actuators-modal-submit"
                  disabled={registerLoading}
                >
                  {registerLoading
                    ? "Registering..."
                    : "Register Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          CONFIRM UNLINK SENSOR NODE MODAL
          =================================================== */}

      {nodeToDelete && (
        <div
          className="actuators-modal-overlay"
          onClick={() => setNodeToDelete(null)}
        >
          <div
            className="actuators-modal-card unlink-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="actuators-unlink-heading">
              <div className="actuators-unlink-icon">
                <Trash2 size={20} />
              </div>

              <h3>Unlink Sensor Node?</h3>
            </div>

            <p className="actuators-modal-description">
              Are you sure you want to unregister{" "}
              <strong>{nodeToDelete.name}</strong>?
              Telemetry sent from this ESP32 board will no
              longer be stored for this zone until
              re-registered.
            </p>

            <div className="actuators-modal-actions">
              <button
                type="button"
                className="actuators-modal-cancel"
                onClick={() => setNodeToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="actuators-modal-danger"
                onClick={handleDeleteNode}
                disabled={deleteLoading}
              >
                {deleteLoading
                  ? "Unlinking..."
                  : "Unlink Node"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          PAGE FOOTER
          =================================================== */}

      <footer className="actuators-page-footer">
        <span>
          © 2026 MENARA. Monitoring Environment for AI
          Rooftop Agriculture.
        </span>
      </footer>
    </div>
  );
};

export default Actuators;
