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
  Clock,
  Layers,
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
        <button
          type="button"
          className="app-btn-primary"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Status
        </button>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Radio size={18} color="#203c28" />
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1e293b" }}>
            Telemetry Sensor Nodes ({nodes.length})
          </h2>
        </div>

        {nodes.length === 0 && !loading && (
          <div className="app-card" style={{ textAlign: "center", padding: "32px 20px", color: "#64748b" }}>
            <Layers size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No sensor nodes registered for this zone.</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
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
                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>{node.id}</strong>
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

                <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>Assigned Zone: <strong style={{ color: "#334155" }}>{zoneLabel}</strong></div>
                  <div>
                    Last Heartbeat:{" "}
                    <strong style={{ color: "#334155" }}>
                      {node.last_seen_at ? formatDateTime(node.last_seen_at) : "Never reported"}
                    </strong>
                  </div>
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
                        background: isSprinkler ? "#e0f2fe" : "#fef3c7",
                        color: isSprinkler ? "#0369a1" : "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActIcon size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        {actuator.driver} driver &bull; {zoneLabel}
                      </span>
                      <h3 style={{ margin: "2px 0 0", fontSize: "15px", color: "#1e293b" }}>
                        {isSprinkler ? "Watering Sprinkler" : isShade ? "Automated Shade Net" : "Supplemental Grow Light"}
                      </h3>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: lastAction?.status === "acked" ? "#dcfce7" : "#f1f5f9",
                      color: lastAction?.status === "acked" ? "#166534" : "#475569",
                      fontWeight: 600,
                    }}
                  >
                    {lastAction ? `Last: ${lastAction.status}` : "Standby"}
                  </span>
                </div>

                {/* SAFETY PARAMETERS */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    background: "#f8fafc",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Max On Duration</span>
                    <strong style={{ color: "#1e293b" }}>{actuator.max_on_seconds}s (Safety Cap)</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Min Cooldown</span>
                    <strong style={{ color: "#1e293b" }}>{actuator.min_interval_minutes} mins</strong>
                  </div>
                </div>

                {/* LAST ACTION STATUS */}
                {lastAction && (
                  <div style={{ fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={13} color="#64748b" />
                    <span>
                      {lastAction.command} ({lastAction.source}) &bull;{" "}
                      {lastAction.executed_at ? formatDateTime(lastAction.executed_at) : "Pending polling"}
                    </span>
                  </div>
                )}

                {/* DURATION SELECTOR */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11.5px", color: "#64748b", marginRight: "4px" }}>Duration:</span>
                  {[15, 30, 45, Math.min(60, actuator.max_on_seconds)].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setCardDuration(actuator.id, sec)}
                      className={`zone-chip ${duration === sec ? "active" : ""}`}
                      style={{ padding: "3px 9px", fontSize: "11px", height: "auto" }}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                  <button
                    type="button"
                    className="app-btn-primary"
                    onClick={() => handleCommand(actuator.id, "turn_on", duration)}
                    disabled={isBusy}
                    style={{
                      flex: 2,
                      padding: "10px",
                      background: "#15803d",
                      borderColor: "#166534",
                    }}
                  >
                    <Timer size={15} />
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
            Actuator trigger durations are strictly bounded by hardware safety limits (maximum {60}s hard cap) and enforced minimum cooldown intervals. Overriding commands requires confirmation to protect plants from over-watering.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Actuators;
