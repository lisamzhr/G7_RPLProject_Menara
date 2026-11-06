import React, { useEffect, useState } from "react";
import {
  Sprout,
  MapPin,
  Plus,
  Trash2,
  Building2,
  Leaf,
  Cpu,
} from "lucide-react";
import { useGarden } from "../context/GardenContext";
import { api } from "../api/client";
import { PlantCategoryKey, SensorNodeItem } from "../types";
import "../styles/garden-profile.css";

export const GardenProfile: React.FC = () => {
  const {
    selectedGarden,
    setSelectedGarden,
    zones,
    categories,
    refreshZones,
    refreshGardens,
    error: contextError,
  } = useGarden();

  // Local state for modals & forms
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showNewGardenModal, setShowNewGardenModal] = useState(false);
  const [showDeleteGardenModal, setShowDeleteGardenModal] = useState(false);
  const [deletingGarden, setDeletingGarden] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<{ id: string; label: string } | null>(null);

  // Add Zone Form state
  const [zoneCategory, setZoneCategory] = useState<PlantCategoryKey | "">("");
  const [zoneLabel, setZoneLabel] = useState("");
  const [zonePlants, setZonePlants] = useState("");
  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [zoneError, setZoneError] = useState("");

  // New Garden Form state
  const [gardenName, setGardenName] = useState("");
  const [gardenLocation, setGardenLocation] = useState("");
  const [gardenLat, setGardenLat] = useState("-6.2234");
  const [gardenLon, setGardenLon] = useState("106.8291");
  const [gardenElevation, setGardenElevation] = useState("35");
  const [gardenAdm4, setGardenAdm4] = useState("31.74.02.1001");
  const [gardenSubmitting, setGardenSubmitting] = useState(false);
  const [gardenError, setGardenError] = useState("");

  // Action status message
  const [statusMessage, setStatusMessage] = useState("");

  // Handle Add Zone submit
  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarden) return;
    if (!zoneCategory) {
      setZoneError("Please select a plant category.");
      return;
    }
    if (!zoneLabel.trim()) {
      setZoneError("Please enter a zone label.");
      return;
    }

    setZoneSubmitting(true);
    setZoneError("");

    try {
      const plantNames = zonePlants
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      await api.createZone(selectedGarden.id, {
        category_key: zoneCategory,
        label: zoneLabel.trim(),
        plant_names: plantNames,
      });

      await refreshZones(selectedGarden.id);
      setShowAddZoneModal(false);
      setZoneLabel("");
      setZonePlants("");
      setZoneCategory("");
      setStatusMessage("Plant zone created successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      setZoneError(err instanceof Error ? err.message : "Failed to create plant zone.");
    } finally {
      setZoneSubmitting(false);
    }
  };

  // Handle Delete Zone submit
  const handleDeleteZone = async () => {
    if (!zoneToDelete || !selectedGarden) return;
    try {
      await api.deleteZone(zoneToDelete.id);
      await refreshZones(selectedGarden.id);
      setZoneToDelete(null);
      setStatusMessage("Plant zone removed.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete plant zone.");
    }
  };

  // Handle Delete Garden submit
  const handleDeleteGarden = async () => {
    if (!selectedGarden) return;
    setDeletingGarden(true);
    try {
      await api.deleteGarden(selectedGarden.id);
      await refreshGardens();
      setShowDeleteGardenModal(false);
      setStatusMessage("Garden facility deleted.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete garden.");
    } finally {
      setDeletingGarden(false);
    }
  };

  // Node state & handlers
  const [nodes, setNodes] = useState<SensorNodeItem[]>([]);
  const [showRegisterNodeModal, setShowRegisterNodeModal] = useState(false);
  const [targetZoneForNode, setTargetZoneForNode] = useState<{ id: string; label: string } | null>(null);
  const [nodeMacAddress, setNodeMacAddress] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [nodeSubmitting, setNodeSubmitting] = useState(false);
  const [nodeError, setNodeError] = useState("");
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; name: string } | null>(null);

  const loadNodes = async () => {
    try {
      const data = await api.getNodes();
      setNodes(data);
    } catch (err) {
      console.error("Failed to load sensor nodes:", err);
    }
  };

  useEffect(() => {
    if (selectedGarden) {
      loadNodes();
    }
  }, [selectedGarden, zones]);

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetZoneForNode) return;
    if (!nodeMacAddress.trim()) {
      setNodeError("Please enter the ESP32 MAC address.");
      return;
    }

    setNodeSubmitting(true);
    setNodeError("");
    try {
      await api.registerNode(targetZoneForNode.id, {
        mac_address: nodeMacAddress.trim(),
        name: nodeName.trim() || undefined,
      });
      setStatusMessage(`Sensor node registered successfully for ${targetZoneForNode.label}!`);
      setTimeout(() => setStatusMessage(""), 4000);
      setShowRegisterNodeModal(false);
      setNodeMacAddress("");
      setNodeName("");
      setTargetZoneForNode(null);
      await loadNodes();
    } catch (err) {
      setNodeError(err instanceof Error ? err.message : "Failed to register sensor node.");
    } finally {
      setNodeSubmitting(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    try {
      await api.deleteNode(nodeToDelete.id);
      setStatusMessage("Sensor node unlinked successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
      setNodeToDelete(null);
      await loadNodes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete sensor node.");
    }
  };

  // Handle Create Garden submit
  const handleCreateGarden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenName.trim() || !gardenLocation.trim()) {
      setGardenError("Name and location are required.");
      return;
    }

    setGardenSubmitting(true);
    setGardenError("");

    try {
      const created = await api.createGarden({
        name: gardenName.trim(),
        location_name: gardenLocation.trim(),
        lat: parseFloat(gardenLat) || 0,
        lon: parseFloat(gardenLon) || 0,
        elevation_m: parseFloat(gardenElevation) || 0,
        adm4_code: gardenAdm4.trim(),
      });

      await refreshGardens();
      setSelectedGarden(created);
      setShowNewGardenModal(false);
      setGardenName("");
      setGardenLocation("");
      setStatusMessage(`Garden "${created.name}" created and selected.`);
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      setGardenError(err instanceof Error ? err.message : "Failed to create garden.");
    } finally {
      setGardenSubmitting(false);
    }
  };

  // Selected category threshold preview
  const activeSelectedCategory = categories.find((c) => c.key === zoneCategory);

  const totalCultivars = zones.reduce(
    (acc, z) => acc + (z.plant_names?.length || 0),
    0
  );

  return (
    <div className="garden-profile-container">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Garden &amp; Plant Profiles</h1>
          <p>
            Manage rooftop garden microclimate locations, plant zones, and botanical threshold baselines for automated micro-irrigation and ventilation.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {selectedGarden && (
            <button
              className="app-btn-primary"
              onClick={() => {
                setZoneCategory(categories[0]?.key || "");
                setShowAddZoneModal(true);
              }}
              type="button"
            >
              <Plus size={16} />
              <span>Add Plant Zone</span>
            </button>
          )}
          <button
            className="app-btn-secondary"
            onClick={() => setShowNewGardenModal(true)}
            type="button"
          >
            <Building2 size={16} />
            <span>New Garden</span>
          </button>
        </div>
      </div>

      {/* STATUS & ERROR ALERTS */}
      {statusMessage && (
        <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", fontSize: "13px" }}>
          {statusMessage}
        </div>
      )}
      {contextError && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", fontSize: "13px" }}>
          {contextError}
        </div>
      )}

      {/* GARDEN OVERVIEW CARD */}
      {selectedGarden ? (
        <section className="gp-overview-card">
          <div className="gp-overview-top">
            <div className="gp-overview-title">
              <h2>{selectedGarden.name}</h2>
              <p>
                <MapPin size={15} />
                <span>{selectedGarden.location_name}</span>
                <span>•</span>
                <span>BMKG ADM4: {selectedGarden.adm4_code}</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span className="gp-badge-category" style={{ background: "#f1f5f9", borderColor: "#cbd5e1", color: "#334155" }}>
                ID: {selectedGarden.id.slice(0, 8)}...
              </span>
              <button
                type="button"
                className="app-btn-danger"
                onClick={() => setShowDeleteGardenModal(true)}
                title="Delete this rooftop garden facility"
              >
                <Trash2 size={13} />
                <span>Delete Garden</span>
              </button>
            </div>
          </div>

          <div className="gp-meta-grid">
            <div className="gp-meta-item">
              <small>Canopy Elevation</small>
              <strong>{selectedGarden.elevation_m} m MSL</strong>
            </div>
            <div className="gp-meta-item">
              <small>Coordinates</small>
              <strong>
                {selectedGarden.lat.toFixed(4)}°, {selectedGarden.lon.toFixed(4)}°
              </strong>
            </div>
            <div className="gp-meta-item">
              <small>Active Plant Zones</small>
              <strong>{zones.length} Zones</strong>
            </div>
            <div className="gp-meta-item">
              <small>Monitored Cultivars</small>
              <strong>{totalCultivars} Cultivars</strong>
            </div>
          </div>
        </section>
      ) : (
        <div className="gp-overview-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <Building2 size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <h3>No Rooftop Garden Selected</h3>
          <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
            Select an existing garden from the top bar or register a new rooftop garden site.
          </p>
          <button
            className="app-btn-primary"
            style={{ margin: "0 auto" }}
            onClick={() => setShowNewGardenModal(true)}
          >
            <Plus size={16} />
            <span>Create First Rooftop Garden</span>
          </button>
        </div>
      )}

      {/* PLANT ZONES & BOTANICAL PROFILES */}
      {selectedGarden && (
        <section className="gp-zones-section">
          <div className="gp-section-header">
            <div>
              <h3>Plant Zones &amp; Botanical Threshold Baselines</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Each zone establishes optimal moisture, temperature, and illumination thresholds derived from agronomic literature.
              </p>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {zones.length} {zones.length === 1 ? "Zone" : "Zones"} configured
            </span>
          </div>

          {zones.length === 0 ? (
            <div
              className="gp-zone-card"
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: "#faf8f5",
                borderStyle: "dashed",
              }}
            >
              <Sprout size={32} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
              <h4 style={{ margin: "0 0 4px", color: "#334155", fontSize: "15px" }}>
                No plant zones registered for {selectedGarden.name}
              </h4>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "12px" }}>
                Add your first zone to configure cultivars and set microclimate thresholds.
              </p>
              <button
                className="app-btn-primary"
                style={{ margin: "0 auto" }}
                onClick={() => {
                  setZoneCategory(categories[0]?.key || "");
                  setShowAddZoneModal(true);
                }}
              >
                <Plus size={15} />
                <span>Add Plant Zone</span>
              </button>
            </div>
          ) : (
            <div className="gp-zones-grid">
              {zones.map((zone) => {
                // Find matching category or use embedded threshold profile
                const matchedCategory = categories.find((c) => c.key === zone.category.key);
                const profile = zone.category.threshold_profile || matchedCategory?.threshold_profile;
                const zoneNode = nodes.find((n) => n.zone_id === zone.id);

                return (
                  <div key={zone.id} className="gp-zone-card">
                    <div className="gp-zone-header">
                      <div className="gp-zone-title-area">
                        <div className="gp-zone-title-row">
                          <h4>{zone.label}</h4>
                          <span className="gp-badge-category">
                            {zone.category.name}
                          </span>
                          <span className="gp-badge-timescale">
                            Timescale: {zone.category.response_timescale}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Zone ID: {zone.id.slice(0, 8)}... • Category Key: {zone.category.key}
                        </span>
                      </div>

                      <button
                        className="gp-btn-delete"
                        type="button"
                        onClick={() => setZoneToDelete({ id: zone.id, label: zone.label })}
                        title="Delete zone"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Connected Sensor Node */}
                    <div
                      style={{
                        margin: "10px 0 12px",
                        padding: "10px 14px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: zoneNode ? "#ecfdf5" : "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Cpu size={18} color={zoneNode ? "#059669" : "#94a3b8"} />
                        </div>
                        {zoneNode ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "13px", color: "#1e293b" }}>
                                {zoneNode.name || zoneNode.id}
                              </strong>
                              {zoneNode.mac_address && (
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    background: "#e2e8f0",
                                    color: "#334155",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {zoneNode.mac_address}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  background: zoneNode.status === "active" ? "#dcfce7" : "#f1f5f9",
                                  color: zoneNode.status === "active" ? "#166534" : "#64748b",
                                }}
                              >
                                {zoneNode.status.toUpperCase()}
                              </span>
                            </div>
                            <small style={{ fontSize: "11px", color: "#64748b" }}>
                              {zoneNode.last_seen_at
                                ? `Last active: ${new Date(zoneNode.last_seen_at).toLocaleTimeString()}`
                                : "Awaiting initial sensor telemetry"}
                            </small>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              No ESP32 sensor node registered for this zone.
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        {zoneNode ? (
                          <button
                            type="button"
                            className="app-btn-danger"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => setNodeToDelete({ id: zoneNode.id, name: zoneNode.name || zoneNode.id })}
                            title="Unlink and unregister sensor node"
                          >
                            <Trash2 size={12} />
                            <span>Unlink Node</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="app-btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => {
                              setTargetZoneForNode({ id: zone.id, label: zone.label });
                              setNodeMacAddress("");
                              setNodeName("");
                              setNodeError("");
                              setShowRegisterNodeModal(true);
                            }}
                          >
                            <Plus size={12} />
                            <span>Register ESP32 Node</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Cultivars */}
                    <div className="gp-cultivars-row">
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                        Monitored Cultivars:
                      </span>
                      {zone.plant_names && zone.plant_names.length > 0 ? (
                        zone.plant_names.map((plant, idx) => (
                          <span key={idx} className="gp-cultivar-tag">
                            <Leaf size={11} />
                            {plant}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          No specific cultivars specified (General {zone.category.name})
                        </span>
                      )}
                    </div>

                    {/* Botanical Thresholds Baseline */}
                    {profile ? (
                      <div className="gp-threshold-grid">
                        <div className="gp-threshold-item">
                          <span className="gp-threshold-label">Soil Moisture Target</span>
                          <span className="gp-threshold-val" style={{ color: "#2563eb" }}>
                            {profile.moisture_min}% – {profile.moisture_max}%
                          </span>
                        </div>
                        <div className="gp-threshold-item">
                          <span className="gp-threshold-label">Air Temperature Target</span>
                          <span className="gp-threshold-val" style={{ color: "#d97706" }}>
                            {profile.temp_min}°C – {profile.temp_max}°C
                          </span>
                        </div>
                        <div className="gp-threshold-item">
                          <span className="gp-threshold-label">Relative Humidity Target</span>
                          <span className="gp-threshold-val" style={{ color: "#0891b2" }}>
                            {profile.humidity_min}% – {profile.humidity_max}%
                          </span>
                        </div>
                        <div className="gp-threshold-item">
                          <span className="gp-threshold-label">Illumination Target</span>
                          <span className="gp-threshold-val" style={{ color: "#ca8a04" }}>
                            {profile.lux_min.toLocaleString()} – {profile.lux_max.toLocaleString()} lx
                          </span>
                        </div>
                        {profile.source_note && (
                          <div className="gp-threshold-source">
                            Agronomic Citation: {profile.source_note}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px 0" }}>
                        Default botanical threshold baselines active for this plant category.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ADD ZONE MODAL */}
      {showAddZoneModal && selectedGarden && (
        <div className="modal-overlay" onClick={() => setShowAddZoneModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add Plant Zone</h3>
            <p>
              Attach a new botanical zone to <strong>{selectedGarden.name}</strong> with target cultivars and threshold baselines.
            </p>

            {zoneError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {zoneError}
              </div>
            )}

            <form onSubmit={handleAddZone}>
              <div className="gp-form-group">
                <label>Plant Category *</label>
                <select
                  className="gp-form-select"
                  value={zoneCategory}
                  onChange={(e) => setZoneCategory(e.target.value as PlantCategoryKey)}
                  required
                >
                  <option value="" disabled>Select plant family / category</option>
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.name} ({cat.response_timescale} response)
                    </option>
                  ))}
                </select>
              </div>

              {activeSelectedCategory?.threshold_profile && (
                <div className="gp-threshold-preview-box">
                  <strong>Baseline Profile ({activeSelectedCategory.name}):</strong>
                  <div style={{ marginTop: "4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <span>Moisture: {activeSelectedCategory.threshold_profile.moisture_min}% – {activeSelectedCategory.threshold_profile.moisture_max}%</span>
                    <span>Temp: {activeSelectedCategory.threshold_profile.temp_min}°C – {activeSelectedCategory.threshold_profile.temp_max}°C</span>
                    <span>Humidity: {activeSelectedCategory.threshold_profile.humidity_min}% – {activeSelectedCategory.threshold_profile.humidity_max}%</span>
                    <span>Lux: {activeSelectedCategory.threshold_profile.lux_min.toLocaleString()} – {activeSelectedCategory.threshold_profile.lux_max.toLocaleString()} lx</span>
                  </div>
                </div>
              )}

              <div className="gp-form-group" style={{ marginTop: "12px" }}>
                <label>Zone Label *</label>
                <input
                  type="text"
                  className="gp-form-input"
                  placeholder="e.g. Zone B - West Raised Beds"
                  value={zoneLabel}
                  onChange={(e) => setZoneLabel(e.target.value)}
                  required
                />
              </div>

              <div className="gp-form-group">
                <label>Cultivar Names (comma-separated)</label>
                <input
                  type="text"
                  className="gp-form-input"
                  placeholder="e.g. Roma Tomato, Cherry Bell, Sweet Basil"
                  value={zonePlants}
                  onChange={(e) => setZonePlants(e.target.value)}
                />
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Separate multiple crop cultivars with commas.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => setShowAddZoneModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={zoneSubmitting}
                >
                  {zoneSubmitting ? "Adding Zone..." : "Create Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW GARDEN MODAL */}
      {showNewGardenModal && (
        <div className="modal-overlay" onClick={() => setShowNewGardenModal(false)}>
          <div className="modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <h3>Register Rooftop Garden</h3>
            <p>
              Register a new rooftop agriculture site with geolocation and BMKG administrative metadata.
            </p>

            {gardenError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {gardenError}
              </div>
            )}

            <form onSubmit={handleCreateGarden}>
              <div className="gp-form-group">
                <label>Garden Installation Name *</label>
                <input
                  type="text"
                  className="gp-form-input"
                  placeholder="e.g. Menara Sky Farm - Tower 2"
                  value={gardenName}
                  onChange={(e) => setGardenName(e.target.value)}
                  required
                />
              </div>

              <div className="gp-form-group">
                <label>Location / Address *</label>
                <input
                  type="text"
                  className="gp-form-input"
                  placeholder="e.g. Setiabudi, South Jakarta, DKI Jakarta"
                  value={gardenLocation}
                  onChange={(e) => setGardenLocation(e.target.value)}
                  required
                />
              </div>

              <div className="gp-form-row">
                <div className="gp-form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="gp-form-input"
                    value={gardenLat}
                    onChange={(e) => setGardenLat(e.target.value)}
                    required
                  />
                </div>
                <div className="gp-form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="gp-form-input"
                    value={gardenLon}
                    onChange={(e) => setGardenLon(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="gp-form-row">
                <div className="gp-form-group">
                  <label>Canopy Elevation (m MSL)</label>
                  <input
                    type="number"
                    className="gp-form-input"
                    value={gardenElevation}
                    onChange={(e) => setGardenElevation(e.target.value)}
                  />
                </div>
                <div className="gp-form-group">
                  <label>BMKG ADM4 Code *</label>
                  <input
                    type="text"
                    className="gp-form-input"
                    placeholder="31.74.02.1001"
                    value={gardenAdm4}
                    onChange={(e) => setGardenAdm4(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => setShowNewGardenModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={gardenSubmitting}
                >
                  {gardenSubmitting ? "Registering..." : "Register Garden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ZONE MODAL */}
      {zoneToDelete && (
        <div className="modal-overlay" onClick={() => setZoneToDelete(null)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#dc2626" }}>Delete Plant Zone?</h3>
            <p>
              Are you sure you want to delete <strong>{zoneToDelete.label}</strong>? This will remove all associated zone configuration.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setZoneToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-btn-danger-solid"
                onClick={handleDeleteZone}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE GARDEN MODAL */}
      {showDeleteGardenModal && selectedGarden && (
        <div className="modal-overlay" onClick={() => setShowDeleteGardenModal(false)}>
          <div className="modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#dc2626" }}>Delete Garden Facility?</h3>
            <p>
              Are you sure you want to delete <strong>{selectedGarden.name}</strong>? This will permanently remove the garden facility, all associated plant zones, sensor nodes, and telemetry.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setShowDeleteGardenModal(false)}
                disabled={deletingGarden}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-btn-danger-solid"
                onClick={handleDeleteGarden}
                disabled={deletingGarden}
              >
                {deletingGarden ? "Deleting..." : "Confirm Delete Garden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER SENSOR NODE MODAL */}
      {showRegisterNodeModal && targetZoneForNode && (
        <div className="modal-overlay" onClick={() => setShowRegisterNodeModal(false)}>
          <div className="modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Cpu size={20} color="#059669" />
              <h3 style={{ margin: 0 }}>Register ESP32 Sensor Node</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Link a physical ESP32 hardware board to <strong>{targetZoneForNode.label}</strong> based on its factory-burned MAC address.
            </p>

            {nodeError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {nodeError}
              </div>
            )}

            <form onSubmit={handleRegisterNode}>
              <div className="gp-form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  ESP32 Hardwired MAC Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24:6F:28:1A:2B:3C"
                  className="gp-form-input"
                  style={{ fontFamily: "monospace" }}
                  value={nodeMacAddress}
                  onChange={(e) => setNodeMacAddress(e.target.value.toUpperCase())}
                />
                <small style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  12-character hex MAC address (separated by colons or hyphens). Printed on device label or output in Serial monitor during boot.
                </small>
              </div>

              <div className="gp-form-group" style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Node Friendly Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zone A Soil Moisture Probe"
                  className="gp-form-input"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => setShowRegisterNodeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={nodeSubmitting}
                >
                  {nodeSubmitting ? "Registering..." : "Register Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM UNLINK NODE MODAL */}
      {nodeToDelete && (
        <div className="modal-overlay" onClick={() => setNodeToDelete(null)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#dc2626" }}>Unlink Sensor Node?</h3>
            <p style={{ fontSize: "13px", color: "#334155", margin: "10px 0 16px" }}>
              Are you sure you want to unregister <strong>{nodeToDelete.name}</strong>? Telemetry sent from this ESP32 board will no longer be stored for this zone until re-registered.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setNodeToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-btn-danger-solid"
                onClick={handleDeleteNode}
              >
                Confirm Unlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GardenProfile;
