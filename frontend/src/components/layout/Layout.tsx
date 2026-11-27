import React from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  Radio,
  LogOut,
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
  const { userProfile, logout } = useGarden();
  const location = useLocation();

  const isGardenProfile = location.pathname === "/garden-profile";
  const isAIRecommendations = location.pathname === "/recommendations";
  const isActuatorsPage = location.pathname === "/actuators";
  const isSettingsPage = location.pathname === "/settings";

  const initials = userProfile?.name
    ? userProfile.name.slice(0, 2).toUpperCase()
    : "GA";

  return (
    <div
      className={`app-shell ${
        isGardenProfile ? "garden-profile-shell" : ""
      } ${
        isAIRecommendations ? "ai-recommendations-shell" : ""
      } ${
        isActuatorsPage ? "actuators-shell" : ""
      } ${
        isSettingsPage ? "settings-shell" : ""
      }`}
    >
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <Link to="/dashboard" className="app-brand">
          <div className="app-brand-logo">
            <img
              src="/LogoMenara.webp"
              alt="MENARA Logo"
              width={256}
              height={128}
              decoding="async"
            />
          </div>

          <div className="app-brand-text">
            <strong>
              MENARA<span className="app-brand-dot" />
            </strong>
            <small>ROOFTOP AGRITECH</small>
          </div>
        </Link>

        {/* NAVIGATION */}
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

        {/* SIDEBAR BOTTOM */}
        <div className="app-sidebar-bottom">
          <div className="app-node-mesh-status">
            <span className="app-mesh-dot" />
            <span style={{ flex: 1 }}>Sensor Nodes Online</span>
            <Radio size={14} />
          </div>

          {/* USER PROFILE */}
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

      {/* MAIN PAGE CONTAINER */}
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;