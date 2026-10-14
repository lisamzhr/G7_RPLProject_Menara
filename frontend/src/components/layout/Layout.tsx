import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        RoofGarden Monitoring &copy; 2026 &bull; Weather Forecast provided by BMKG Indonesia
      </footer>
    </div>
  );
};
