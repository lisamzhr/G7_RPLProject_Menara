import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { AlertItem } from "../types";
import { getStatusBadge } from "../lib/status";
import { formatDateTime } from "../lib/format";

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleConfirm = async (id: string) => {
    await api.confirmAlert(id, "Confirmed by gardener via web UI");
    fetchAlerts();
  };

  const handleOverride = async (id: string) => {
    await api.overrideAlert(id, "Overridden by gardener");
    fetchAlerts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts & Human-In-The-Loop Actions</h1>
        <p className="text-sm text-slate-500 mt-1">Review pending automated recommendations and sensor warnings.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          🎉 No pending alerts. All rooftop zones are running normally!
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const badge = getStatusBadge(alert.level);
            return (
              <div key={alert.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badge.bgColor} ${badge.textColor}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(alert.created_at)}</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-2">{alert.message}</p>
                </div>

                {alert.requires_confirmation && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirm(alert.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition"
                    >
                      Confirm Action
                    </button>
                    <button
                      onClick={() => handleOverride(alert.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition"
                    >
                      Override
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
