import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  Sprout,
  Sun,
  Wind,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { api } from "../api/client";
import { DashboardSummary, Garden, PlantZone } from "../types";
import { getStatusBadge } from "../lib/status";

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [zoneStatuses, setZoneStatuses] = useState<
    Record<string, "normal" | "advisory" | "warning">
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

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
          zList.map((zone) =>
            api
              .getZoneStatus(zone.id)
              .then((status) => ({
                id: zone.id,
                status: status.overall_status,
              }))
              .catch(() => ({
                id: zone.id,
                status: "normal" as const,
              }))
          )
        );

        const statusMap: Record<
          string,
          "normal" | "advisory" | "warning"
        > = {};

        statusList.forEach((item) => {
          statusMap[item.id] = item.status;
        });

        setZoneStatuses(statusMap);
      } else {
        setZones([]);
        setZoneStatuses({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const garden = gardens[0];
  const weather = summary?.weather_summary;

  const healthyZones = summary?.zones_ok ?? 0;
  const attentionZones = summary?.zones_need_attention ?? 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#527A4D]">
        <RefreshCw size={30} className="animate-spin" />
        <p className="text-sm font-medium">
          Loading rooftop garden status...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h3 className="font-semibold text-lg">
          Unable to load dashboard
        </h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#26352B]">

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard
            </h1>

            <span className="flex items-center gap-1.5 rounded-full border border-[#DCE6D6] bg-white px-3 py-1 text-xs text-[#527A4D] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#6FA66B]" />
              Live Overview
            </span>
          </div>

          <p className="mt-1 text-sm text-[#718071]">
            Monitor your rooftop garden conditions and activities.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#DCE3D6] bg-white px-4 py-2.5 text-sm font-medium text-[#527A4D] shadow-sm transition hover:bg-[#F1F5EC]"
        >
          <RefreshCw size={15} />
          Refresh Data
        </button>
      </div>

      {/* Garden Overview */}
      <section className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F0E5] text-[#527A4D]">
              <Sprout size={23} />
            </div>

            <div>
              <h2 className="font-bold text-[#26352B]">
                {garden?.name || "My Rooftop Garden"}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#7B8979]">
                <MapPin size={13} />
                {weather?.location || "Garden Location"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#EAF4E6] px-4 py-3">
              <Activity size={17} className="text-[#527A4D]" />
              <div>
                <p className="text-xs text-[#718071]">Healthy Zones</p>
                <p className="font-bold text-[#365D38]">
                  {healthyZones} Zones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[#FFF4DD] px-4 py-3">
              <Activity size={17} className="text-[#B88935]" />
              <div>
                <p className="text-xs text-[#8D7A55]">Need Attention</p>
                <p className="font-bold text-[#9B7028]">
                  {attentionZones} Zones
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Summary Cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Garden Summary</h2>
          <span className="text-xs text-[#829080]">
            Current Overview
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Total Zones */}
          <div className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718071]">
                Total Plant Zones
              </p>
              <div className="rounded-lg bg-[#E8F0E5] p-2 text-[#527A4D]">
                <Leaf size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold">
              {zones.length}
            </p>
            <p className="mt-2 text-xs text-[#829080]">
              Registered garden zones
            </p>
          </div>

          {/* Healthy Zones */}
          <div className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718071]">
                Healthy Zones
              </p>
              <div className="rounded-lg bg-[#E8F0E5] p-2 text-[#527A4D]">
                <Sprout size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#527A4D]">
              {healthyZones}
            </p>
            <p className="mt-2 text-xs text-[#829080]">
              Zones in normal condition
            </p>
          </div>

          {/* Attention */}
          <div className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718071]">
                Need Attention
              </p>
              <div className="rounded-lg bg-[#FFF4DD] p-2 text-[#B88935]">
                <Activity size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#B88935]">
              {attentionZones}
            </p>
            <p className="mt-2 text-xs text-[#829080]">
              Zones requiring monitoring
            </p>
          </div>

          {/* Weather */}
          <div className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718071]">
                Rain Probability
              </p>
              <div className="rounded-lg bg-[#EAF0FA] p-2 text-[#6688BD]">
                <CloudSun size={19} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#6688BD]">
              {weather?.rain_probability_pct ?? "--"}%
            </p>
            <p className="mt-2 text-xs text-[#829080]">
              Based on weather forecast
            </p>
          </div>

        </div>
      </section>

      {/* Weather Section */}
      {weather && (
        <section className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF0FA] p-2.5 text-[#6688BD]">
                <CloudSun size={23} />
              </div>
              <div>
                <h2 className="font-bold">BMKG Weather Integration</h2>
                <p className="text-xs text-[#829080]">
                  Weather information for your garden
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full border border-[#DCE4F2] bg-[#F0F4FB] px-3 py-1 text-xs font-medium text-[#6688BD]">
              {weather.location}
            </span>
          </div>

          <div className="mt-5 rounded-xl bg-[#F4F3EB] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Sun size={37} className="text-[#D6A846]" />
                <div>
                  <p className="text-3xl font-bold">
                    {weather.temp_c}°C
                  </p>
                  <p className="text-sm text-[#718071]">
                    {weather.forecast}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white px-5 py-3">
                <p className="text-xs text-[#829080]">
                  Rain Probability
                </p>
                <p className="text-2xl font-bold text-[#6688BD]">
                  {weather.rain_probability_pct}%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-[#E6EADF] p-4">
              <Droplets size={21} className="text-[#6688BD]" />
              <div>
                <p className="text-xs text-[#829080]">Weather Forecast</p>
                <p className="text-sm font-semibold">
                  {weather.forecast}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#E6EADF] p-4">
              <Wind size={21} className="text-[#6688BD]" />
              <div>
                <p className="text-xs text-[#829080]">Location</p>
                <p className="text-sm font-semibold">
                  {weather.location}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Plant Zones */}
      <section className="rounded-2xl border border-[#DCE4D7] bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Plant Zones</h2>
            <p className="mt-1 text-xs text-[#829080]">
              Monitor the condition of each garden zone.
            </p>
          </div>

          <span className="rounded-full bg-[#EAF2E7] px-3 py-1 text-xs font-medium text-[#527A4D]">
            {zones.length} Zones
          </span>
        </div>

        {zones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DCE4D7] bg-[#FAFBF7] p-8 text-center">
            <Sprout size={30} className="mx-auto text-[#A8C3A0]" />
            <p className="mt-3 font-medium text-[#527A4D]">
              No plant zones available
            </p>
            <p className="mt-1 text-sm text-[#829080]">
              Your garden zones will appear here once configured.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {zones.map((zone) => {
              const statusLevel = zoneStatuses[zone.id] || "normal";
              const badge = getStatusBadge(statusLevel);

              return (
                <Link
                  key={zone.id}
                  to={`/zones/${zone.id}`}
                  className="group rounded-xl border border-[#E1E8DD] bg-[#FCFDF9] p-5 transition-all hover:-translate-y-0.5 hover:border-[#A8C3A0] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-[#E8F0E5] p-2.5 text-[#527A4D]">
                        <Sprout size={20} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#26352B]">
                          {zone.label}
                        </h3>
                        <p className="mt-1 text-xs text-[#829080]">
                          {zone.category.name}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {badge.icon} {badge.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-[#829080]">
                      Plants in this zone
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {zone.plant_names.join(", ") || "No plants listed"}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E8EDE4] pt-3">
                    <span className="text-xs text-[#829080]">
                      Response: {zone.category.response_timescale}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-semibold text-[#527A4D] transition group-hover:gap-2">
                      View Details
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="border-t border-[#DCE4D7] pt-4 text-right">
        <p className="text-xs text-[#829080]">
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </p>
      </div>

    </div>
  );
};