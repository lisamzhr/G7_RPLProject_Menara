import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Reading } from "../../types";
import { formatTimestamp } from "../../lib/format";

interface TelemetryChartProps {
  data: Reading[];
  metricKey: "soil_moisture_pct" | "temperature_c" | "humidity_pct" | "lux";
  title: string;
  unit: string;
  color: string;
  idealMin?: number;
  idealMax?: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  metricKey,
  title,
  unit,
  color,
  idealMin,
  idealMax,
}) => {
  const chartData = data.map((d) => ({
    time: formatTimestamp(d.ts),
    value: d[metricKey],
  }));

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-xs text-slate-500 font-mono">Unit: {unit}</span>
      </div>

      <div className="h-56 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No telemetry data points available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
                formatter={(val: any) => [`${val} ${unit}`, title]}
              />
              {idealMin !== undefined && (
                <ReferenceLine
                  y={idealMin}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: `Min (${idealMin})`, position: "insideBottomLeft", fill: "#10b981", fontSize: 10 }}
                />
              )}
              {idealMax !== undefined && (
                <ReferenceLine
                  y={idealMax}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: `Max (${idealMax})`, position: "insideTopLeft", fill: "#10b981", fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
