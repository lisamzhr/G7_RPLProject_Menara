import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings as SettingsIcon,
  Radio,
  UserRound,
  MoreVertical,
  Cloud,
  Save,
  Camera,
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
} from "lucide-react";
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
    description: "Immediate notification if any ESP32 mesh node or LoRa telemetry stream goes offline.",
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
  const [fullName, setFullName] = useState("Dr. Ezzedine Ruzash");
  const [email, setEmail] = useState("ezzedine.ruzash@menara-agritech.id");
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("menaraPassword");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(true);
  const [station, setStation] = useState("Kebun Atap Menteng");

  const toggleNotification = (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
    setSaved(false);
  };

  const saveProfile = () => {
    setSaved(true);
    setMessage("Account information saved successfully (demo).");
  };

  const updatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in both new password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully (demo).");
  };

  const handleCancel = () => {
    setFullName("Dr. Ezzedine Ruzash");
    setEmail("ezzedine.ruzash@menara-agritech.id");
    setMessage("");
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
              <strong>Dr. Ezzedine Ruzash</strong>
              <span>Lead Agronomist</span>
            </div>
            <button aria-label="More options">
              <MoreVertical size={19} />
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
                <span className="admin-badge">Admin Tier</span>
              </div>
              <p>
                Manage your account credentials, security access keys, and
                operational telemetry notifications.
              </p>
            </div>

            <div className={`settings-save-status ${saved ? "is-saved" : ""}`}>
              <Cloud size={14} />
              <span>
                {saved ? "All changes saved automatically" : "Unsaved changes"}
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
                <p>Personal credentials, agronomist accreditation, and rooftop zone attribution.</p>
              </div>
              <span className="verified-badge">PROFILE VERIFIED</span>
            </div>

            <div className="account-profile">
              <div className="profile-avatar">
                ER
                <span />
              </div>
              <div className="profile-details">
                <div className="profile-name">
                  <strong>Dr. Ezzedine Ruzash</strong>
                  <span>Agronomist</span>
                </div>
                <p>Lead Agronomist • Kebun Atap Menteng (Canopy Sector 2B)</p>
                <p>License ID: AGR-IDN-2024-8849 • Operational Clearance Level 4</p>
              </div>
              <button className="change-photo-button" onClick={() => setMessage("Photo upload is a demo feature.")}>
                <Camera size={13} />
                Change Photo
              </button>
            </div>

            <div className="account-form">
              <label className="settings-field">
                <span>Full Legal Name</span>
                <div className="field-input">
                  <input value={fullName} onChange={(e) => { setFullName(e.target.value); setSaved(false); }} />
                  <UserRound size={15} />
                </div>
                <small>Name displayed across automated harvest reports & sensor logs.</small>
              </label>

              <label className="settings-field">
                <span className="field-label-row">
                  Official Email Address
                  <small><CheckCircle2 size={11} /> Verified</small>
                </span>
                <div className="field-input">
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} />
                  <span className="mail-icon">✉</span>
                </div>
                <small>Primary address for urgent alert dispatches and weekly BMKG forecasts.</small>
              </label>
            </div>

            <div className="account-bottom">
              <span><CheckCircle2 size={13} /> Profile updates reflect across all linked rooftop canopy stations.</span>
              <div>
                <button className="cancel-button" onClick={handleCancel}>Cancel</button>
                <button className="save-button" onClick={saveProfile}>
                  <Save size={13} /> Save Changes
                </button>
              </div>
            </div>
          </section>

          {/* FACILITY */}
          <section className="settings-panel facility-panel">
            <div className="settings-panel-heading facility-heading">
              <div className="settings-section-icon">
                <Building2 size={19} />
              </div>
              <div className="settings-section-title">
                <h2>
                  Rooftop Monitoring Facility & Location Attribution
                  <span className="active-site-badge">ACTIVE SITE</span>
                </h2>
                <p>Deployment geometry, building attribution, microclimate pods, and telemetry hardware gateway.</p>
              </div>
              <button className="switch-station-button" onClick={() => setStation(station === "Kebun Atap Menteng" ? "Kebun Atap Salemba" : "Kebun Atap Menteng")}>
                <RefreshCw size={12} />
                Switch Monitoring Station
              </button>
            </div>

            <div className="facility-divider" />

            <div className="facility-grid">
              <div className="facility-info">
                <div className="facility-topline">
                  <span>FACILITY & BUILDING</span>
                  <span className="floor-badge">▦ 7th Floor Rooftop</span>
                </div>
                <strong>{station}</strong>
                <p>Gedung Agro-Teknika Lt. 7 (Rooftop Level)</p>
                <div className="facility-address">
                  <MapPin size={12} />
                  Jl. Menteng Raya No. 24, Menteng, Central Jakarta, DKI Jakarta 10310
                </div>
              </div>

              <div className="facility-side">
                <div className="cultivars-box">
                  <span>Facility Cultivars & System:</span>
                  <div>
                    <span>Bok Choy</span>
                    <span>Cherry Tomato</span>
                    <span>Water Spinach</span>
                    <span>Hydro Mint</span>
                  </div>
                </div>
                <a
                  className="maps-link"
                  href="https://www.google.com/maps/search/?api=1&query=Jl.+Menteng+Raya+No.+24+Jakarta"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span><MapPin size={13} /> Open in Google Maps / BMKG Geo-Portal</span>
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
                  <h2>Security & Password</h2>
                  <p>Update credentials and manage cryptographic access.</p>
                </div>
                <KeyRound size={16} />
              </div>

              <div className="password-fields">
                <label className="settings-field">
                  <span>Current Password</span>
                  <div className="field-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>

                <label className="settings-field">
                  <span className="field-label-row">
                    New Password <small>Min. 8 characters</small>
                  </span>
                  <div className="field-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter robust passphrase"
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
                      placeholder="Re-enter new passphrase"
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
                  <strong>Last password change: 34 days ago</strong>
                  <span>Two-Factor Authentication (2FA) active via Authenticator app.</span>
                </div>
              </div>

              <button className="update-password-button" onClick={updatePassword}>
                <RefreshCw size={13} /> Update Password
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
                        onClick={() => toggleNotification(item.id)}
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="notification-delivery">
                <span><LockKeyhole size={13} /> Delivered via Web Application & Email</span>
                <strong>Active Push</strong>
              </div>
            </section>
          </div>

          {message && (
            <div className="settings-feedback">
              <InfoIcon />
              <span>{message}</span>
              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {/* HARDWARE STATUS */}
          <section className="hardware-status">
            <div className="hardware-left">
              <Network size={20} />
              <div>
                <strong>Active Hardware Integration: Node Mesh v4.2</strong>
                <span>36 Rooftop Probes Connected • 0 Sensor Faults • Last synchronization 120s ago</span>
              </div>
            </div>
            <div className="hardware-right">
              <span />
              LATENCY: 42ms • SSL AES-256
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

const InfoIcon = () => <CheckCircle2 size={15} />;

export default Settings;