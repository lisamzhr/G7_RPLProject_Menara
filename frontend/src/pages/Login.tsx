import React from "react";
import { Link } from "react-router-dom";

export const Login: React.FC = () => {
  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
      <div className="text-4xl mb-3">🌱</div>
      <h1 className="text-2xl font-bold text-slate-900">RoofGarden Monitor</h1>
      <p className="text-sm text-slate-500 mt-1">Sign in with Supabase Auth</p>

      <div className="mt-6 space-y-4">
        <input
          type="email"
          placeholder="gardener@example.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          defaultValue="demo-gardener@jakarta-roofs.id"
        />
        <input
          type="password"
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          defaultValue="password123"
        />
        <Link
          to="/"
          className="w-full block py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};
