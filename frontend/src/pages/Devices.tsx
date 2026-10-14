import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { ActuatorItem } from "../types";

export const Devices: React.FC = () => {
  const [actuators, setActuators] = useState<ActuatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await api.getActuators();
      setActuators(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleManualWater = async (actuatorId: string) => {
    try {
      setActionMsg("Queueing sprinkler command...");
      await api.commandActuator(actuatorId, "turn_on", 30);
      setActionMsg("Sprinkler turn_on (30s) queued! Node will execute on next poll.");
      fetchDevices();
    } catch (err: any) {
      setActionMsg(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Devices & Actuators</h1>
        <p className="text-sm text-slate-500 mt-1">Manage relays, sprinklers, and safety caps.</p>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg border border-emerald-200">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading devices...</div>
      ) : actuators.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          No actuators found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actuators.map((act) => (
            <div key={act.id} className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900 capitalize">{act.type.replace('_', ' ')}</h3>
                  <p className="text-xs text-slate-500 mt-1">Driver: {act.driver} &bull; Zone: {act.zone_id.slice(0, 8)}...</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 font-mono">
                  Cap: {act.max_on_seconds}s
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Min Interval: {act.min_interval_minutes}m
                </span>
                <button
                  onClick={() => handleManualWater(act.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                >
                  Water (30s)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
