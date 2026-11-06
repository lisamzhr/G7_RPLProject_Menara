import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings as SettingsIcon,
  Radio,
  UserRound,
  LogOut,
  Cloud,
  Save,
  ClipboardList,
  Building2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Bell,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Waves,
  Lightbulb,
  RefreshCw,
  CloudRain,
  Network,
  Sliders,
  LockKeyhole,
  UserPlus,
  Trash2,
} from "lucide-react";
import { api } from "../api/client";
import type { Garden, GardenMember } from "../types";
import "../styles/settings.css";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Garden Profile", path: "/garden-profile", icon: Sprout },
  { label: "Environmental Monitoring", path: "/monitoring", icon: Activity },
  { label: "AI Recommendations", path: "/recommendations", icon: Brain, tag: "AI" },
  { label: "Device Control", path: "/devices", icon: SlidersHorizontal },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

type NotificationSetting = {
  id: string;
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  type: string;
  enabled: boolean;
  tag?: string;
};

const initialNotifications: NotificationSetting[] = [
  {
    id: "environment",
    title: "Environmental Warnings",
    description: "Alert when canopy temperature, VPD, or soil moisture crosses danger thresholds.",
    icon: AlertTriangle,
    type: "warning",
    enabled: true,
  },
  {
    id: "sensors",
    title: "Disconnected Sensors",
    description: "Immediate notification if any ESP32 mesh node or telemetry stream goes offline.",
    icon: Waves,
    type: "sensor",
    enabled: true,
  },
  {
    id: "ai",
    title: "AI Recommendations",
    description: "Actionable advisory alerts from the agronomic intelligence engine (e.g. misting cycles).",
    icon: Lightbulb,
    type: "ai",
    enabled: true,
    tag: "AI",
  },
  {
    id: "weather",
    title: "Weather Updates",
    description: "Hyperlocal BMKG rainfall radar and convective squall warnings in Central Jakarta.",
    icon: CloudRain,
    type: "weather",
    enabled: false,
    tag: "BMKG",
  },
];

export const Settings = () => {
  const navigate = useNavigate();

  const storedUser =
    localStorage.getItem("roofgarden_user") ||
    sessionStorage.getItem("roofgarden_user");

  let initialName = "Gardener";
  let initialEmail = localStorage.getItem("roofgarden_email") || "";
  let initialRole = "Gardener";

  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      initialName = u.name || initialName;
      initialEmail = u.email || initialEmail;
      initialRole = u.role || initialRole;
    } catch {
      // fallback
    }
  }

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState(initialNotifications);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(true);

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [members, setMembers] = useState<GardenMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("roofgarden_token");
    sessionStorage.removeItem("roofgarden_token");
    localStorage.removeItem("roofgarden_user");
    sessionStorage.removeItem("roofgarden_user");
    navigate("/login", { replace: true });
  };

  // Load gardens
  useEffect(() => {
    let isMounted = true;
    const loadGardens = async () => {
      try {
        const data = await api.getGardens();
        if (!isMounted) return;
        setGardens(data);
        if (data.length > 0) {
          setSelectedGarden(data[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load gardens:", err);
      }
    };
    loadGardens();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load garden members
  useEffect(() => {
    if (!selectedGarden) {
      setMembers([]);
      return;
    }
    let isMounted = true;
    const loadMembers = async () => {
      try {
        const mems = await api.getGardenMembers(selectedGarden.id);
        if (!isMounted) return;
        setMembers(mems);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load garden members:", err);
      }
    };
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [selectedGarden]);

  const toggleNotification = (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
    setSaved(false);
  };

  const saveProfile = () => {
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        u.name = fullName;
        u.email = email;
        const json = JSON.stringify(u);
        localStorage.setItem("roofgarden_user", json);
        sessionStorage.setItem("roofgarden_user", json);
      } catch {
        // fallback
      }
    }
    setSaved(true);
    setMessage("Account information updated successfully.");
  };

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in both new password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword.length > 72) {
      setMessage("New password must not exceed 72 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await api.resetPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancel = () => {
    setFullName(initialName);
    setEmail(initialEmail);
    setMessage("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarden || !newMemberEmail.trim()) return;
    try {
      setAddingMember(true);
      const newMem = await api.addGardenMember(selectedGarden.id, newMemberEmail.trim());
      setMembers([...members, newMem]);
      setNewMemberEmail("");
      setMessage(`Added member ${newMem.name || newMem.email} to ${selectedGarden.name}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGarden) return;
    try {
      await api.removeGardenMember(selectedGarden.id, userId);
      setMembers(members.filter((m) => m.user_id !== userId));
      setMessage("Member removed from garden.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-brand">
          <div className="settings-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>
          <div className="settings-brand-text">
            <h2>MENARA <span /></h2>
            <p>ROOFTOP AGRITECH</p>
          </div>
        </div>

        <nav className="settings-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `settings-nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.tag && <span className="settings-nav-tag">{item.tag}</span>}
                {item.path === "/settings" && (
                  <span className="settings-nav-indicator" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="settings-sidebar-bottom">
          <div className="settings-online">
            <span />
            Online • Node Mesh
            <Radio size={16} />
          </div>

          <div className="settings-user">
            <div className="settings-user-avatar">
              <UserRound size={21} />
            </div>
            <div className="settings-user-info">
              <strong title={fullName}>{fullName}</strong>
              <span>{initialRole}</span>
            </div>
            <button aria-label="Log out" title="Log out" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="settings-main">
        <div className="settings-content">
          <header className="settings-heading">
            <div>
              <div className="settings-title-row">
                <h1>Settings</h1>
                <span className="admin-badge">{initialRole.toUpperCase()} TIER</span>
              </div>
              <p>
                Manage your account credentials, security access keys, and operational telemetry notifications.
              </p>
            </div>

            <div className={`settings-save-status ${saved ? "is-saved" : ""}`}>
              <Cloud size={14} />
              <span>
                {saved ? "All settings verified" : "Unsaved changes"}
              </span>
            </div>
          </header>

          {/* ACCOUNT INFORMATION */}
          <section className="settings-panel account-panel">
            <div className="settings-panel-heading">
              <div className="settings-section-icon">
                <ClipboardList size={19} />
              </div>
              <div className="settings-section-title">
                <h2>Account Information</h2>
                <p>Personal profile credentials and rooftop garden attribution.</p>
              </div>
              <span className="verified-badge">PROFILE VERIFIED</span>
            </div>

            <div className="account-profile">
              <div className="profile-avatar">
                {fullName.slice(0, 2).toUpperCase()}
                <span />
              </div>
              <div className="profile-details">
                <div className="profile-name">
                  <strong>{fullName}</strong>
                  <span>{initialRole}</span>
                </div>
                <p>{selectedGarden ? `${selectedGarden.name} (${selectedGarden.location_name})` : "Urban Rooftop Garden"}</p>
                <p>Status: Active Account • Operational Clearance Level 4</p>
              </div>
            </div>

            <div className="account-form">
              <label className="settings-field">
                <span>Full Name</span>
                <div className="field-input">
                  <input value={fullName} onChange={(e) => { setFullName(e.target.value); setSaved(false); }} />
                  <UserRound size={15} />
                </div>
                <small>Name displayed across automated harvest reports &amp; sensor logs.</small>
              </label>

              <label className="settings-field">
                <span className="field-label-row">
                  Email Address
                  <small><CheckCircle2 size={11} /> Verified</small>
                </span>
                <div className="field-input">
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} />
                  <span className="mail-icon">✉</span>
                </div>
                <small>Primary address for urgent alert dispatches and BMKG forecasts.</small>
              </label>
            </div>

            <div className="account-bottom">
              <span><CheckCircle2 size={13} /> Profile updates reflect across all linked rooftop stations.</span>
              <div>
                <button className="cancel-button" type="button" onClick={handleCancel}>Cancel</button>
                <button className="save-button" type="button" onClick={saveProfile}>
                  <Save size={13} /> Save Profile
                </button>
              </div>
            </div>
          </section>

          {/* FACILITY & MEMBERS */}
          <section className="settings-panel facility-panel">
            <div className="settings-panel-heading facility-heading">
              <div className="settings-section-icon">
                <Building2 size={19} />
              </div>
              <div className="settings-section-title">
                <h2>
                  Rooftop Monitoring Facility &amp; Members
                  <span className="active-site-badge">ACTIVE SITE</span>
                </h2>
                <p>Facility attribution, microclimate coordinates, and authorized garden members.</p>
              </div>
              {gardens.length > 1 && (
                <button
                  className="switch-station-button"
                  type="button"
                  onClick={() => {
                    const currentIndex = gardens.findIndex((g) => g.id === selectedGarden?.id);
                    const nextGarden = gardens[(currentIndex + 1) % gardens.length];
                    setSelectedGarden(nextGarden);
                  }}
                >
                  <RefreshCw size={12} />
                  Switch Garden ({selectedGarden?.name})
                </button>
              )}
            </div>

            <div className="facility-divider" />

            <div className="facility-grid">
              <div className="facility-info">
                <div className="facility-topline">
                  <span>FACILITY &amp; BUILDING</span>
                  <span className="floor-badge">▦ Elevation {selectedGarden?.elevation_m ?? 20}m</span>
                </div>
                <strong>{selectedGarden?.name || "No Garden"}</strong>
                <p>Location: {selectedGarden?.location_name || "Indonesia"}</p>
                <div className="facility-address">
                  <MapPin size={12} />
                  BMKG Adm4 Code: {selectedGarden?.adm4_code || "31.71.06.1001"} • Coordinates: {selectedGarden?.lat.toFixed(4)}, {selectedGarden?.lon.toFixed(4)}
                </div>
              </div>

              <div className="facility-side">
                <div className="cultivars-box">
                  <span>Garden Members ({members.length}):</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    {members.map((m) => (
                      <div
                        key={m.user_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fff",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      >
                        <span>
                          <strong>{m.name || m.email}</strong> ({m.role})
                        </span>
                        {m.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id)}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                            title="Remove member"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddMember} style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <input
                    type="email"
                    placeholder="Add user email..."
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={addingMember}
                    style={{
                      background: "#28452e",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <UserPlus size={13} /> Add
                  </button>
                </form>

                <a
                  className="maps-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedGarden ? `${selectedGarden.lat},${selectedGarden.lon}` : "Jakarta"}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span><MapPin size={13} /> Open in BMKG Geo-Portal</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </section>

          {/* SECURITY AND NOTIFICATIONS */}
          <div className="settings-bottom-grid">
            <section className="settings-panel security-panel">
              <div className="bottom-panel-heading">
                <div className="settings-section-icon">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <h2>Security &amp; Password</h2>
                  <p>Update credentials via backend Bearer authentication.</p>
                </div>
                <KeyRound size={16} />
              </div>

              <div className="password-fields">
                <label className="settings-field">
                  <span className="field-label-row">
                    New Password <small>Min. 8 characters</small>
                  </span>
                  <div className="field-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>

                <label className="settings-field">
                  <span>Confirm New Password</span>
                  <div className="field-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="password-security-note">
                <CheckCircle2 size={13} />
                <div>
                  <strong>Cryptographic Hashing</strong>
                  <span>Passwords are hashed with Bcrypt before persistence in PostgreSQL.</span>
                </div>
              </div>

              <button
                className="update-password-button"
                type="button"
                onClick={updatePassword}
                disabled={savingPassword}
              >
                <RefreshCw size={13} className={savingPassword ? "spin" : ""} />
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </section>

            <section className="settings-panel notification-panel">
              <div className="bottom-panel-heading">
                <div className="settings-section-icon">
                  <Bell size={19} />
                </div>
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Choose which alerts and telemetry updates you receive.</p>
                </div>
                <Sliders size={16} />
              </div>

              <div className="notification-list">
                {notifications.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="notification-item" key={item.id}>
                      <div className={`notification-icon ${item.type}`}>
                        <Icon size={15} />
                      </div>
                      <div className="notification-text">
                        <strong>
                          {item.title}
                          {item.tag && <span className={`notification-tag ${item.type}`}>{item.tag}</span>}
                        </strong>
                        <p>{item.description}</p>
                      </div>
                      <button
                        className={`toggle-switch ${item.enabled ? "enabled" : ""}`}
                        aria-label={`Toggle ${item.title}`}
                        aria-pressed={item.enabled}
                        type="button"
                        onClick={() => toggleNotification(item.id)}
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="notification-delivery">
                <span><LockKeyhole size={13} /> Delivered via Web Application Telemetry</span>
                <strong>Active Telemetry</strong>
              </div>
            </section>
          </div>

          {message && (
            <div className="settings-feedback">
              <CheckCircle2 size={15} />
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {/* HARDWARE STATUS */}
          <section className="hardware-status">
            <div className="hardware-left">
              <Network size={20} />
              <div>
                <strong>Active Hardware Integration: Node Mesh v4.2</strong>
                <span>Connected Rooftop Nodes • Zero Sensor Faults</span>
              </div>
            </div>
            <div className="hardware-right">
              <span />
              SSL AES-256 • Telemetry Ready
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </footer>
      </main>
    </div>
  );
};

export default Settings;
