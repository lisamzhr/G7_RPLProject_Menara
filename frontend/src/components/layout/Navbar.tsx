import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/alerts", label: "Alerts" },
    { to: "/devices", label: "Devices" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-800">
          <span className="text-2xl">🌱</span>
          <span>RoofGarden Jakarta</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-50 text-emerald-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
