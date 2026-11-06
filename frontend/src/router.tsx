import { type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Dashboard } from "./pages/Dashboard";
import { GardenProfile } from "./pages/GardenProfile";
import { EnvironmentalMonitoring } from "./pages/EnvironmentalMonitoring";
import { AIRecommendations } from "./pages/AIRecommendations";
import { Devices } from "./pages/Devices";
import { Settings } from "./pages/Settings";

import { Login } from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();

  const token =
    localStorage.getItem("roofgarden_token") ||
    sessionStorage.getItem("roofgarden_token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    ),
  },
  {
    path: "/garden-profile",
    element: (
      <RequireAuth>
        <GardenProfile />
      </RequireAuth>
    ),
  },
  {
    path: "/monitoring",
    element: (
      <RequireAuth>
        <EnvironmentalMonitoring />
      </RequireAuth>
    ),
  },
  {
    path: "/recommendations",
    element: (
      <RequireAuth>
        <AIRecommendations />
      </RequireAuth>
    ),
  },
  {
    path: "/devices",
    element: (
      <RequireAuth>
        <Devices />
      </RequireAuth>
    ),
  },
  {
    path: "/settings",
    element: (
      <RequireAuth>
        <Settings />
      </RequireAuth>
    ),
  },
]);