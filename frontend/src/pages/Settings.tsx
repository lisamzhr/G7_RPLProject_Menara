import React from "react";

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings & Data Sources</h1>
        <p className="text-sm text-slate-500 mt-1">Horticultural parameters, location configuration, and meteorological attribution.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-900">Weather API Attribution</h3>
        <p className="text-sm text-slate-600">
          Real-time Indonesian meteorological forecast and alerts are powered by <strong>BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)</strong>.
        </p>
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
          Source: BMKG Public Weather Forecast API &bull; Cache Policy: 15-minute refresh &bull; Jakarta Microclimate Station
        </div>
      </div>
    </div>
  );
};
