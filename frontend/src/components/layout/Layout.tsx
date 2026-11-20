import React, { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  Radio,
  LogOut,
  ChevronDown,
  Building2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useGarden } from "../../context/GardenContext";
import "../../styles/app-shell.css";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Garden Profile", path: "/garden-profile", icon: Sprout },
  { label: "Environmental Monitoring", path: "/monitoring", icon: Activity },
  { label: "AI Recommendations", path: "/recommendations", icon: Brain, tag: "AI" },
  { label: "Actuators & Nodes", path: "/actuators", icon: SlidersHorizontal },
  { label: "Settings", path: "/settings", icon: Settings },
];

export const Layout: React.FC = () => {
  const {
    gardens,
    selectedGarden,
    setSelectedGarden,
    userProfile,
    loading,
    logout,
  } = useGarden();

  const [showGardenMenu, setShowGardenMenu] = useState(false);

  const initials = userProfile?.name
    ? userProfile.name.slice(0, 2).toUpperCase()
    : "GA";

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <Link to="/dashboard" className="app-brand">
          <div className="app-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>
          <div className="app-brand-text">
            <strong>
              MENARA<span className="app-brand-dot" />
            </strong>
            <small>ROOFTOP AGRITECH</small>
          </div>
        </Link>

        <nav className="app-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `app-nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.tag && <span className="app-nav-tag">{item.tag}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar-bottom">
          <div className="app-node-mesh-status">
            <span className="app-mesh-dot" />
            <span style={{ flex: 1 }}>Sensor Nodes Online</span>
            <Radio size={14} />
          </div>

          <div className="app-user-profile">
            <div className="app-user-avatar">{initials}</div>
            <div className="app-user-info">
              <strong title={userProfile?.name || "Gardener"}>
                {userProfile?.name || "Gardener"}
              </strong>
              <small>{userProfile?.role || "Gardener"}</small>
            </div>
            <button
              className="app-logout-button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="app-main">
        {/* TOPBAR */}
        <header className="app-topbar">
          <div className="app-topbar-left">
            <span style={{ fontSize: "12px", color: "#64748b" }}>Rooftop Facility:</span>
            <strong style={{ fontSize: "13px", color: "#1e293b" }}>
              {selectedGarden?.name || "No Garden Selected"}
            </strong>
          </div>

          <div className="app-topbar-right">
            <div className={`app-sync-pill ${loading ? "loading" : ""}`}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Syncing..." : "Connected"}</span>
            </div>

            {/* GARDEN SELECTOR */}
            <div className="app-garden-selector">
              <button
                type="button"
                className="app-garden-button"
                onClick={() => setShowGardenMenu(!showGardenMenu)}
              >
                <Building2 size={16} color="#203c28" />
                <div>
                  <strong>{selectedGarden?.name || "Select Garden"}</strong>
                  <small>{selectedGarden?.location_name || "Location"}</small>
                </div>
                <ChevronDown size={14} color="#64748b" />
              </button>

              {showGardenMenu && (
                <div className="app-garden-dropdown">
                  <div style={{ padding: "6px 16px 8px", borderBottom: "1px solid #f1f5f9", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Switch Garden Facility
                  </div>
                  {gardens.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`app-garden-option ${g.id === selectedGarden?.id ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedGarden(g);
                        setShowGardenMenu(false);
                      }}
                    >
                      <strong>{g.name}</strong>
                      <small>{g.location_name} • {g.elevation_m}m</small>
                    </button>
                  ))}
                  {gardens.length === 0 && (
                    <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>
                      No gardens found.
                    </div>
                  )}
                  <div style={{ padding: "8px 12px 4px", borderTop: "1px solid #f1f5f9" }}>
                    <Link
                      to="/garden-profile"
                      onClick={() => setShowGardenMenu(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "#203c28",
                        fontWeight: 600,
                        textDecoration: "none",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        background: "#f0fdf4",
                      }}
                    >
                      <Plus size={14} /> Add New Garden Facility
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE OUTLET */}
        <main className="app-content">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="app-footer">
          <span>&copy; 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.</span>
          <span>Weather data powered by BMKG Indonesia</span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
