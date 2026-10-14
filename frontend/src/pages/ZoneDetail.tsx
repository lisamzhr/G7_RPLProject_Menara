import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { ZoneStatus, Reading } from "../types";
import { getStatusBadge, getParamStatusBadge } from "../lib/status";
import { TelemetryChart } from "../components/charts/TelemetryChart";

export const ZoneDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<ZoneStatus | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const [st, rd] = await Promise.all([
          api.getZoneStatus(id!),
          api.getZoneReadings(id!, range, "raw"),
        ]);
        setStatus(st);
        setReadings(rd);
      } catch (err: any) {
        setError(err.message || "Failed to load zone");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, range]);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading zone telemetry...</div>;
  if (error || !status) return <div className="p-6 bg-rose-50 text-rose-800 rounded-lg">Error loading zone.</div>;

  const badge = getStatusBadge(status.overall_status);
  const p = status.parameter_status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">&larr; Back to Dashboard</Link>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">{status.zone_label}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Category: <span className="font-semibold text-slate-700 capitalize">{status.category_key.replace('_', ' ')}</span>
        </p>

        {/* 4 Parameter Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { name: "Soil Moisture", m: p.moisture },
            { name: "Temperature", m: p.temperature },
            { name: "Humidity", m: p.humidity },
            { name: "Solar Illuminance", m: p.lux },
          ].map((item, idx) => {
            const pBadge = getParamStatusBadge(item.m.status as any);
            return (
              <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-500 block">{item.name}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {item.m.value}{item.m.unit}
                </span>
                <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded border ${pBadge.bgColor}`}>
                  {pBadge.label}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Ideal: {item.m.ideal_min} - {item.m.ideal_max}{item.m.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation & "Why?" Panel */}
      {status.latest_recommendation && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-bold text-emerald-900">AI Agronomic Recommendation</h3>
          </div>
          <p className="text-sm text-emerald-950 mt-2 font-medium leading-relaxed">
            {status.latest_recommendation.message}
          </p>

          <div className="mt-4 pt-3 border-t border-emerald-200">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Horticultural Rationale & Sources:</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-emerald-800 list-disc list-inside">
              {status.latest_recommendation.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Charts Section with Range Selector */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Historical Telemetry Charts</h3>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setRange("24h")}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                range === "24h"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Past 24 Hours
            </button>
            <button
              onClick={() => setRange("7d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-b border-r ${
                range === "7d"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Past 7 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TelemetryChart
            data={readings}
            metricKey="soil_moisture_pct"
            title="Soil Moisture Trend"
            unit="%"
            color="#0ea5e9"
            idealMin={p.moisture.ideal_min}
            idealMax={p.moisture.ideal_max}
          />
          <TelemetryChart
            data={readings}
            metricKey="temperature_c"
            title="Ambient Temperature Trend"
            unit="°C"
            color="#f97316"
            idealMin={p.temperature.ideal_min}
            idealMax={p.temperature.ideal_max}
          />
          <TelemetryChart
            data={readings}
            metricKey="humidity_pct"
            title="Relative Humidity Trend"
            unit="%"
            color="#8b5cf6"
            idealMin={p.humidity.ideal_min}
            idealMax={p.humidity.ideal_max}
          />
          <TelemetryChart
            data={readings}
            metricKey="lux"
            title="Solar Illuminance Trend"
            unit="lx"
            color="#eab308"
            idealMin={p.lux.ideal_min}
            idealMax={p.lux.ideal_max}
          />
        </div>
      </div>
    </div>
  );
};
