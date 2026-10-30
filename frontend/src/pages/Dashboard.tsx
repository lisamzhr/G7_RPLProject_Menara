import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DashboardSummary, Garden, PlantZone } from "../types";
import { getStatusBadge } from "../lib/status";

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, "normal" | "advisory" | "warning">>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [sum, gards] = await Promise.all([
          api.getDashboardSummary(),
          api.getGardens(),
        ]);
        setSummary(sum);
        setGardens(gards);

        if (gards.length > 0) {
          const zList = await api.getZones(gards[0].id);
          setZones(zList);

          const statusList = await Promise.all(
            zList.map((z) =>
              api
                .getZoneStatus(z.id)
                .then((st) => ({ id: z.id, status: st.overall_status }))
                .catch(() => ({ id: z.id, status: "normal" as const }))
            )
          );
          const stMap: Record<string, "normal" | "advisory" | "warning"> = {};
          statusList.forEach((s) => {
            stMap[s.id] = s.status;
          });
          setZoneStatuses(stMap);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Loading rooftop garden status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
        <h3 className="font-semibold text-lg">Unable to load dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary Card */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {gardens[0]?.name || "Rooftop Garden"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              📍 {summary.weather_summary.location} &bull; Forecast: {summary.weather_summary.forecast} ({summary.weather_summary.temp_c}°C, {summary.weather_summary.rain_probability_pct}% rain chance)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <span className="text-2xl font-bold text-emerald-700">{summary.zones_ok}</span>
              <span className="block text-xs text-emerald-800">Zones OK</span>
            </div>
            <div className={`px-4 py-2 rounded-lg text-center border ${summary.zones_need_attention > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-2xl font-bold ${summary.zones_need_attention > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                {summary.zones_need_attention}
              </span>
              <span className="block text-xs text-slate-600">Need Attention</span>
            </div>
          </div>
        </div>
      )}

      {/* Zones Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Plant Zones</h2>
        {zones.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
            No plant zones configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone) => {
              const statusLevel = zoneStatuses[zone.id] || "normal";
              const badge = getStatusBadge(statusLevel);
              return (
                <Link
                  key={zone.id}
                  to={`/zones/${zone.id}`}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all block"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">{zone.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {zone.category.name} &bull; {zone.plant_names.join(", ")}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-600">
                    <span>Response timescale: {zone.category.response_timescale}</span>
                    <span className="font-medium text-emerald-700">View Details &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
