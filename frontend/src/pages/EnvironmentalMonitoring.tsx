import React, { useEffect, useState } from "react";
import {
  Thermometer,
  Droplet,
  Sprout,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Clock3,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useGarden } from "../context/GardenContext";
import { api } from "../api/client";
import { formatTimestamp } from "../lib/format";
import type { ParameterMetric, Reading, ZoneStatus } from "../types";
import "../styles/environmental-monitoring.css";

type TimeRange = "24 Hours" | "7 Days" | "30 Days";
type MetricTab = "all" | "moisture" | "climate" | "lux";

export const EnvironmentalMonitoring: React.FC = () => {
  const {
    zones,
    selectedZone,
    setSelectedZone,
  } = useGarden();

  const [timeRange, setTimeRange] = useState<TimeRange>("24 Hours");
  const [activeMetricTab, setActiveMetricTab] = useState<MetricTab>("all");
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load zone status when selectedZone changes
  useEffect(() => {
    if (!selectedZone) {
      setZoneStatus(null);
      return;
    }

    let isMounted = true;
    const loadStatus = async () => {
      try {
        const status = await api.getZoneStatus(selectedZone.id);
        if (!isMounted) return;
        setZoneStatus(status);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load zone status:", err);
      }
    };

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [selectedZone]);

  // Load readings when selectedZone or timeRange changes
  useEffect(() => {
    if (!selectedZone) {
      setReadings([]);
      return;
    }

    let isMounted = true;
    const loadReadings = async () => {
      try {
        setReadingsLoading(true);
        setError("");
        const rangeParam =
          timeRange === "24 Hours" ? "24h" : timeRange === "7 Days" ? "7d" : "30d";
        const aggParam =
          timeRange === "30 Days" || timeRange === "7 Days" ? "hourly" : "raw";

        const data = await api.getZoneReadings(selectedZone.id, rangeParam, aggParam);
        if (!isMounted) return;
        setReadings(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load telemetry readings.");
      } finally {
        if (isMounted) setReadingsLoading(false);
      }
    };

    loadReadings();
    return () => {
      isMounted = false;
    };
  }, [selectedZone, timeRange]);

  // Format chart data
  const chartData = readings.map((r) => ({
    time: formatTimestamp(r.ts),
    temperature: r.temperature_c,
    humidity: r.humidity_pct,
    moisture: r.soil_moisture_pct,
    lux: r.lux,
  }));

  // Build sensor metrics from live zoneStatus parameter_status
  const paramStatus = (zoneStatus?.parameter_status || {}) as Record<string, ParameterMetric>;
  const tempMetric = paramStatus.temperature;
  const humMetric = paramStatus.humidity;
  const soilMetric = paramStatus.moisture;
  const luxMetric = paramStatus.lux;
  const latestReading = zoneStatus?.latest_reading;

  const calculateProgress = (metric?: ParameterMetric) => {
    if (!metric) return 50;
    if (metric.ideal_max <= metric.ideal_min) return 50;
    const ratio = (metric.value - metric.ideal_min) / (metric.ideal_max - metric.ideal_min);
    return Math.max(5, Math.min(100, Math.round(ratio * 100)));
  };

  const sensorCards = [
    {
      name: "DHT22 Microclimate Sensor",
      title: "AIR TEMPERATURE",
      value: tempMetric ? `${tempMetric.value}` : latestReading ? `${latestReading.temperature_c}` : "—",
      unit: "°C",
      status: tempMetric?.status === "ok" ? "Optimal Range" : tempMetric?.status === "high" ? "Above Ideal" : "Below Ideal",
      statusType: tempMetric?.status === "ok" ? "optimal" : "warning",
      icon: Thermometer,
      min: tempMetric ? `${tempMetric.ideal_min}°C` : "Min —",
      target: tempMetric ? `Optimal: ${tempMetric.ideal_min} – ${tempMetric.ideal_max}°C` : "Target —",
      max: tempMetric ? `${tempMetric.ideal_max}°C` : "Max —",
      fill: "temperature",
      progress: calculateProgress(tempMetric),
      idealMin: tempMetric?.ideal_min,
      idealMax: tempMetric?.ideal_max,
    },
    {
      name: "DHT22 Microclimate Sensor",
      title: "AIR HUMIDITY",
      value: humMetric ? `${humMetric.value}` : latestReading ? `${latestReading.humidity_pct}` : "—",
      unit: "% RH",
      status: humMetric?.status === "ok" ? "Optimal Range" : humMetric?.status === "high" ? "Above Ideal" : "Below Ideal",
      statusType: humMetric?.status === "ok" ? "optimal" : "warning",
      icon: Droplet,
      min: humMetric ? `${humMetric.ideal_min}%` : "Min —",
      target: humMetric ? `Optimal: ${humMetric.ideal_min} – ${humMetric.ideal_max}%` : "Target —",
      max: humMetric ? `${humMetric.ideal_max}%` : "Max —",
      fill: "humidity",
      progress: calculateProgress(humMetric),
      idealMin: humMetric?.ideal_min,
      idealMax: humMetric?.ideal_max,
    },
    {
      name: "Capacitive Substrate Probe",
      title: "SOIL MOISTURE",
      value: soilMetric ? `${soilMetric.value}` : latestReading ? `${latestReading.soil_moisture_pct}` : "—",
      unit: "%",
      status: soilMetric?.status === "ok" ? "Optimal Hydration" : soilMetric?.status === "low" ? "Dry / Deficit" : "Saturated",
      statusType: soilMetric?.status === "ok" ? "optimal" : "warning",
      icon: Sprout,
      min: soilMetric ? `${soilMetric.ideal_min}%` : "Min —",
      target: soilMetric ? `Optimal: ${soilMetric.ideal_min} – ${soilMetric.ideal_max}%` : "Target —",
      max: soilMetric ? `${soilMetric.ideal_max}%` : "Max —",
      fill: "moisture",
      progress: calculateProgress(soilMetric),
      idealMin: soilMetric?.ideal_min,
      idealMax: soilMetric?.ideal_max,
    },
    {
      name: "BH1750 Ambient Light Sensor",
      title: "LIGHT INTENSITY",
      value: luxMetric ? Number(luxMetric.value).toLocaleString() : latestReading ? Number(latestReading.lux).toLocaleString() : "—",
      unit: "lux",
      status: luxMetric?.status === "ok" ? "Optimal Radiation" : luxMetric?.status === "high" ? "High Solar Flux" : "Low Light",
      statusType: luxMetric?.status === "ok" ? "optimal" : "warning",
      icon: Sun,
      min: luxMetric ? `${Number(luxMetric.ideal_min).toLocaleString()} lx` : "0 lx",
      target: luxMetric ? `Optimal: ${Number(luxMetric.ideal_min).toLocaleString()} – ${Number(luxMetric.ideal_max).toLocaleString()} lx` : "Target —",
      max: luxMetric ? `${Number(luxMetric.ideal_max).toLocaleString()} lx` : "—",
      fill: "light",
      progress: calculateProgress(luxMetric),
      idealMin: luxMetric?.ideal_min,
      idealMax: luxMetric?.ideal_max,
    },
  ];

  const abnormalCount = Object.values(paramStatus).filter((m) => m.status !== "ok").length;

  return (
    <div className="monitoring-container">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Environmental Monitoring</h1>
          <p>
            Real-time telemetry and diurnal environmental tracking across rooftop canopy microclimates and planting beds.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ZONE CHIPS SELECTOR STRIP */}
      {zones.length > 0 && (
        <div className="monitoring-zone-strip">
          <div className="zone-chips" style={{ margin: 0 }}>
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

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Viewing: <strong style={{ color: "#1e3926" }}>{selectedZone?.label || "Zone"}</strong>
            {selectedZone && (
              <span style={{ marginLeft: "6px", color: "#2b4f35" }}>
                ({selectedZone.category.name})
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4 LIVE SENSOR CARDS */}
      <section className="monitoring-sensor-grid">
        {sensorCards.map((sensor) => {
          const Icon = sensor.icon;
          return (
            <article className="monitoring-sensor-card" key={sensor.title}>
              <div className="monitoring-sensor-top">
                <div className="monitoring-sensor-type">
                  <div className="monitoring-sensor-icon">
                    <Icon size={18} />
                  </div>
                  <span>{sensor.name}</span>
                </div>

                <span className={`monitoring-sensor-status ${sensor.statusType}`}>
                  <span />
                  {sensor.status}
                </span>
              </div>

              <div className="monitoring-sensor-reading">
                <span>{sensor.title}</span>
                <div className="monitoring-reading-val">
                  <strong>{sensor.value}</strong>
                  <small>{sensor.unit}</small>
                </div>
              </div>

              <div className="monitoring-progress-bar">
                <div
                  className={`monitoring-progress-fill ${sensor.fill}`}
                  style={{ width: `${sensor.progress}%` }}
                />
              </div>

              <div className="monitoring-sensor-scale">
                <span>{sensor.min}</span>
                <strong>{sensor.target}</strong>
                <span>{sensor.max}</span>
              </div>
            </article>
          );
        })}
      </section>

      {/* HISTORICAL SENSOR DATA CARD */}
      <section className="monitoring-history-card">
        <div className="monitoring-history-header">
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#1e3926" }}>
              {selectedZone?.label || "Zone"} Telemetry History
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Diurnal progression of ambient microclimate parameters and substrate moisture over time.
            </p>
          </div>

          <div className="monitoring-chart-controls">
            {/* Metric Filter Tabs */}
            <div className="monitoring-metric-tabs">
              <button
                type="button"
                className={`monitoring-metric-tab ${activeMetricTab === "all" ? "active" : ""}`}
                onClick={() => setActiveMetricTab("all")}
              >
                All Core Metrics
              </button>
              <button
                type="button"
                className={`monitoring-metric-tab ${activeMetricTab === "moisture" ? "active" : ""}`}
                onClick={() => setActiveMetricTab("moisture")}
              >
                Soil Moisture
              </button>
              <button
                type="button"
                className={`monitoring-metric-tab ${activeMetricTab === "climate" ? "active" : ""}`}
                onClick={() => setActiveMetricTab("climate")}
              >
                Temp &amp; Humidity
              </button>
              <button
                type="button"
                className={`monitoring-metric-tab ${activeMetricTab === "lux" ? "active" : ""}`}
                onClick={() => setActiveMetricTab("lux")}
              >
                Light (Lux)
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="monitoring-range-selector">
              {(["24 Hours", "7 Days", "30 Days"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={timeRange === range ? "selected" : ""}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Chart */}
        <div className="monitoring-chart-container">
          {readingsLoading ? (
            <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "13px" }}>
              Loading telemetry history...
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
              No telemetry data points available for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              {activeMetricTab === "all" ? (
                <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e8ede5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d8e4d5", fontSize: 12 }} />
                  <Area type="monotone" dataKey="temperature" stroke="#ea580c" strokeWidth={2.4} fill="url(#tempGradient)" dot={false} activeDot={{ r: 4 }} name="Air Temp (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#2563eb" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} name="Air Humidity (% RH)" />
                  <Line type="monotone" dataKey="moisture" stroke="#16a34a" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} name="Soil Moisture (%)" />
                </AreaChart>
              ) : activeMetricTab === "moisture" ? (
                <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#e8ede5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d8e4d5", fontSize: 12 }} />
                  {soilMetric?.ideal_min && (
                    <ReferenceLine y={soilMetric.ideal_min} stroke="#16a34a" strokeDasharray="3 3" label={{ value: `Optimal Min ${soilMetric.ideal_min}%`, fill: "#16a34a", fontSize: 11 }} />
                  )}
                  {soilMetric?.ideal_max && (
                    <ReferenceLine y={soilMetric.ideal_max} stroke="#16a34a" strokeDasharray="3 3" label={{ value: `Optimal Max ${soilMetric.ideal_max}%`, fill: "#16a34a", fontSize: 11 }} />
                  )}
                  <Line type="monotone" dataKey="moisture" stroke="#16a34a" strokeWidth={2.8} dot={false} activeDot={{ r: 5 }} name="Soil Moisture (%)" />
                </LineChart>
              ) : activeMetricTab === "climate" ? (
                <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#e8ede5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d8e4d5", fontSize: 12 }} />
                  <Line type="monotone" dataKey="temperature" stroke="#ea580c" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} name="Air Temp (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#2563eb" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} name="Air Humidity (% RH)" />
                </LineChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#e8ede5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #d8e4d5", fontSize: 12 }} />
                  <Line type="monotone" dataKey="lux" stroke="#ca8a04" strokeWidth={2.6} dot={false} activeDot={{ r: 4 }} name="Light Intensity (Lux)" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* CHART FOOTER & DIAGNOSTICS */}
        <div className="monitoring-chart-footer">
          <div className="monitoring-legend">
            {(activeMetricTab === "all" || activeMetricTab === "climate") && (
              <div className="monitoring-legend-item">
                <span className="monitoring-legend-dot temp" />
                <span>Air Temp (°C)</span>
              </div>
            )}
            {(activeMetricTab === "all" || activeMetricTab === "climate") && (
              <div className="monitoring-legend-item">
                <span className="monitoring-legend-dot humidity" />
                <span>Air Humidity (% RH)</span>
              </div>
            )}
            {(activeMetricTab === "all" || activeMetricTab === "moisture") && (
              <div className="monitoring-legend-item">
                <span className="monitoring-legend-dot moisture" />
                <span>Soil Moisture (%)</span>
              </div>
            )}
            {(activeMetricTab === "all" || activeMetricTab === "lux") && (
              <div className="monitoring-legend-item">
                <span className="monitoring-legend-dot lux" />
                <span>Light Intensity (Lux)</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b" }}>
              <Clock3 size={13} />
              Rolling {timeRange === "24 Hours" ? "24-hr" : timeRange === "7 Days" ? "7-day" : "30-day"} window
            </span>

            <div className={`monitoring-status-banner ${abnormalCount === 0 ? "all-good" : "has-issues"}`}>
              {abnormalCount === 0 ? (
                <>
                  <ShieldCheck size={14} />
                  <span>All microclimate parameters within optimal range</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  <span>{abnormalCount} parameter{abnormalCount > 1 ? "s" : ""} out of optimal bounds</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EnvironmentalMonitoring;
