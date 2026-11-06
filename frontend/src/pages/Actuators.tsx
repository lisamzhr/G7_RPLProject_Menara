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
} from "lucide-react";
import { api } from "../api/client";
import { useGarden } from "../context/GardenContext";
import { formatDateTime } from "../lib/format";
import type { ActuatorItem, SensorNodeItem } from "../types";

export const Actuators: React.FC = () => {
  const { selectedGarden, zones, selectedZone, setSelectedZone } = useGarden();

  const [nodes, setNodes] = useState<SensorNodeItem[]>([]);
  const [actuators, setActuators] = useState<ActuatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cardDurations, setCardDurations] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("Live hardware status and actuators scoped to selected garden.");
  const [errorNotice, setErrorNotice] = useState("");

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerZoneId, setRegisterZoneId] = useState<string>("");
  const [registerMac, setRegisterMac] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // Deletion modal state
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setErrorNotice(err instanceof Error ? err.message : "Failed to load actuators or sensor nodes.");
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedGarden]);

  const handleCommand = async (
    actuatorId: string,
    command: "turn_on" | "turn_off",
    durationSeconds = 30
  ) => {
    try {
      setActionLoadingId(actuatorId);
      setErrorNotice("");
      const res = await api.commandActuator(actuatorId, command, durationSeconds);
      setNotice(`Command '${command}' queued successfully (ID: ${res.command_id.slice(0, 8)}...). Waiting for node poll.`);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send command to actuator.";
      setErrorNotice(msg);
      setNotice(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getCardDuration = (actuator: ActuatorItem) => {
    return cardDurations[actuator.id] || Math.min(30, actuator.max_on_seconds);
  };

  const setCardDuration = (actuatorId: string, seconds: number) => {
    setCardDurations((prev) => ({ ...prev, [actuatorId]: seconds }));
  };

  const openRegisterModal = (zoneIdDefault?: string) => {
    const target = zoneIdDefault || selectedZone?.id || zones[0]?.id || "";
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
      setNotice(`Sensor node '${res.name || res.id}' registered successfully!`);
      await loadData();
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Failed to register sensor node.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    try {
      setDeleteLoading(true);
      await api.deleteNode(nodeToDelete.id);
      setNotice(`Sensor node '${nodeToDelete.name}' unlinked successfully.`);
      setNodeToDelete(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unlink sensor node.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const zoneMap = new Map(zones.map((z) => [z.id, z.label]));

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Actuators &amp; Sensor Nodes</h1>
          <p>
            Monitor telemetry nodes and trigger automated irrigation sprinklers and climate control actuators.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="app-btn-primary"
            onClick={() => openRegisterModal()}
          >
            <Plus size={14} />
            <span>Register ESP32 Node</span>
          </button>
          <button
            type="button"
            className="app-btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* ZONE CHIP SELECTOR */}
      {zones.length > 1 && (
        <div className="zone-chips">
          <span style={{ fontSize: "12px", color: "#64748b", marginRight: "4px" }}>Filter Zone:</span>
          <button
            type="button"
            className={`zone-chip ${selectedZone === null ? "active" : ""}`}
            onClick={() => setSelectedZone(null)}
          >
            All Zones
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`zone-chip ${selectedZone?.id === z.id ? "active" : ""}`}
              onClick={() => setSelectedZone(z)}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}

      {/* FEEDBACK BANNER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          borderRadius: "10px",
          background: errorNotice ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${errorNotice ? "#fca5a5" : "#bbf7d0"}`,
          color: errorNotice ? "#b91c1c" : "#166534",
          marginBottom: "24px",
          fontSize: "13px",
        }}
      >
        {errorNotice ? <AlertTriangle size={17} /> : <Info size={17} />}
        <span>{notice}</span>
      </div>

      {/* SECTION 1: SENSOR NODES */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Radio size={18} color="#203c28" />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1e293b" }}>
              Telemetry Sensor Nodes ({nodes.length})
            </h2>
          </div>
          <button
            type="button"
            className="app-btn-secondary"
            style={{ padding: "5px 12px", fontSize: "12px" }}
            onClick={() => openRegisterModal()}
          >
            <Plus size={13} />
            <span>Register Node</span>
          </button>
        </div>

        {nodes.length === 0 && !loading && (
          <div className="app-card" style={{ textAlign: "center", padding: "36px 20px", color: "#64748b" }}>
            <Layers size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ margin: "0 0 12px" }}>
              No sensor nodes registered {selectedZone ? `for ${selectedZone.label}` : "in this garden"}.
            </p>
            <button
              type="button"
              className="app-btn-primary"
              style={{ fontSize: "13px" }}
              onClick={() => openRegisterModal(selectedZone?.id)}
            >
              <Plus size={14} />
              <span>Register ESP32 Node</span>
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {nodes.map((node) => {
            const isOnline = node.status === "active";
            const zoneLabel = node.zone_label || zoneMap.get(node.zone_id) || node.zone_id.slice(0, 8);

            return (
              <article key={node.id} className="app-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: isOnline ? "#22c55e" : "#94a3b8",
                        boxShadow: isOnline ? "0 0 8px #22c55e" : "none",
                      }}
                    />
                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>{node.name || node.id}</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: isOnline ? "#dcfce7" : "#f1f5f9",
                      color: isOnline ? "#15803d" : "#64748b",
                    }}
                  >
                    {node.status}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div>Assigned Zone: <strong style={{ color: "#334155" }}>{zoneLabel}</strong></div>
                  {node.mac_address && (
                    <div>
                      MAC Address:{" "}
                      <code style={{ fontFamily: "monospace", fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#334155" }}>
                        {node.mac_address}
                      </code>
                    </div>
                  )}
                  <div>Hardware ID: <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{node.id}</span></div>
                  <div>
                    Last Heartbeat:{" "}
                    <strong style={{ color: "#334155" }}>
                      {node.last_seen_at ? formatDateTime(node.last_seen_at) : "Never reported"}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                  <button
                    type="button"
                    className="app-btn-danger"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                    onClick={() => setNodeToDelete({ id: node.id, name: node.name || node.id })}
                    title="Unlink and unregister sensor node"
                  >
                    <Trash2 size={13} />
                    <span>Unlink Node</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: ACTUATORS */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Droplet size={18} color="#203c28" />
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1e293b" }}>
            Irrigation &amp; Climate Actuators ({actuators.length})
          </h2>
        </div>

        {actuators.length === 0 && !loading && (
          <div className="app-card" style={{ textAlign: "center", padding: "36px 20px", color: "#64748b" }}>
            <Droplet size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "15px", margin: "0 0 4px", color: "#1e293b" }}>No Actuators Found</h3>
            <p style={{ margin: 0, fontSize: "13px" }}>
              There are no actuators mapped to this garden. Seed demo data or register an actuator via the backend.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
          {actuators.map((actuator) => {
            const isSprinkler = actuator.type === "sprinkler";
            const isShade = actuator.type === "shade_net";
            const ActIcon = isSprinkler ? Droplet : isShade ? Wind : SunMedium;
            const zoneLabel = zoneMap.get(actuator.zone_id) || `Zone ${actuator.zone_id.slice(0, 8)}`;
            const lastAction = actuator.last_action;
            const isBusy = actionLoadingId === actuator.id;
            const duration = getCardDuration(actuator);

            return (
              <article key={actuator.id} className="app-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "#f0fdf4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActIcon size={22} color="#15803d" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                        {isSprinkler ? "Zone Irrigation Sprinkler" : isShade ? "Automated Shade Net" : "Supplementary Grow Light"}
                      </h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Assigned to: <strong style={{ color: "#334155" }}>{zoneLabel}</strong>
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#475569",
                    }}
                  >
                    Driver: {actuator.driver}
                  </span>
                </div>

                {/* LAST CONTROL ACTION */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#475569",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Last Command:</span>
                    <strong style={{ color: "#1e293b" }}>
                      {lastAction ? `${lastAction.command} (${lastAction.source})` : "None"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Execution State:</span>
                    <strong
                      style={{
                        color:
                          lastAction?.status === "acked"
                            ? "#15803d"
                            : lastAction?.status === "pending"
                            ? "#b45309"
                            : "#64748b",
                      }}
                    >
                      {lastAction?.status ? lastAction.status.toUpperCase() : "IDLE"}
                    </strong>
                  </div>
                  {lastAction?.executed_at && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Triggered At:</span>
                      <span>{formatDateTime(lastAction.executed_at)}</span>
                    </div>
                  )}
                </div>

                {/* DURATION SLIDER */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Timer size={13} />
                      Duration Seconds
                    </span>
                    <strong style={{ color: "#1e293b" }}>{duration}s</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max={actuator.max_on_seconds}
                    step="5"
                    value={duration}
                    onChange={(e) => setCardDuration(actuator.id, Number(e.target.value))}
                    disabled={isBusy}
                    style={{ width: "100%", accentColor: "#203c28", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                    <span>5s</span>
                    <span>Max {actuator.max_on_seconds}s</span>
                  </div>
                </div>

                {/* MANUAL TRIGGER BUTTONS */}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    className="app-btn-primary"
                    onClick={() => handleCommand(actuator.id, "turn_on", duration)}
                    disabled={isBusy}
                    style={{
                      flex: 2,
                      padding: "10px",
                    }}
                  >
                    {isBusy ? "Queuing..." : `Trigger ${duration}s ${isSprinkler ? "Watering" : "On"}`}
                  </button>

                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => handleCommand(actuator.id, "turn_off", 1)}
                    disabled={isBusy}
                    style={{
                      flex: 1,
                      padding: "10px",
                    }}
                  >
                    Turn Off
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* SAFETY NOTICE CARD */}
        <div
          className="app-card"
          style={{
            marginTop: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
          }}
        >
          <ShieldCheck size={20} color="#166534" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "12.5px", color: "#57534e" }}>
            <strong style={{ color: "#292524", display: "block", marginBottom: "2px" }}>
              Hardware Safety Interlocks Enforced
            </strong>
            Actuator trigger durations are strictly bounded by hardware safety limits (maximum 60s hard cap) and enforced minimum cooldown intervals. Overriding commands requires confirmation to protect plants from over-watering.
          </div>
        </div>
      </section>

      {/* REGISTER SENSOR NODE MODAL */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Cpu size={20} color="#203c28" />
              <h3 style={{ margin: 0 }}>Register ESP32 Sensor Node</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Link a physical ESP32 hardware board to a plant zone based on its factory MAC address. Multiple sensor nodes can monitor the same zone.
            </p>

            {registerError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "14px" }}>
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterNode}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Target Plant Zone *
                </label>
                <select
                  className="app-input"
                  style={{ width: "100%" }}
                  value={registerZoneId}
                  onChange={(e) => setRegisterZoneId(e.target.value)}
                  required
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label} ({z.category.name})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  ESP32 MAC Address *
                </label>
                <input
                  type="text"
                  className="app-input"
                  style={{ width: "100%", fontFamily: "monospace" }}
                  placeholder="24:6F:28:XX:YY:ZZ"
                  value={registerMac}
                  onChange={(e) => setRegisterMac(e.target.value.toUpperCase())}
                  required
                />
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Retrieved in Arduino via <code>WiFi.macAddress()</code>.
                </span>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Node Friendly Name (Optional)
                </label>
                <input
                  type="text"
                  className="app-input"
                  style={{ width: "100%" }}
                  placeholder="e.g., North Bed Hydroponic Sensor"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={registerLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={registerLoading}
                >
                  {registerLoading ? "Registering..." : "Register Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM UNLINK SENSOR NODE MODAL */}
      {nodeToDelete && (
        <div className="modal-overlay" onClick={() => setNodeToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <h3 style={{ color: "#dc2626", margin: "0 0 8px" }}>Unlink Sensor Node?</h3>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 20px" }}>
              Are you sure you want to unregister <strong>{nodeToDelete.name}</strong>? Telemetry sent from this ESP32 board will no longer be stored for this zone until re-registered.
            </p>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setNodeToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-btn-danger-solid"
                onClick={handleDeleteNode}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Unlinking..." : "Unlink Node"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Actuators;
