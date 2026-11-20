import { type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Layout } from "./components/layout/Layout";
import { GardenProvider } from "./context/GardenContext";
import { Dashboard } from "./pages/Dashboard";
import { GardenProfile } from "./pages/GardenProfile";
import { EnvironmentalMonitoring } from "./pages/EnvironmentalMonitoring";
import { AIRecommendations } from "./pages/AIRecommendations";
import { Actuators } from "./pages/Actuators";
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
    element: (
      <RequireAuth>
        <GardenProvider>
          <Layout />
        </GardenProvider>
      </RequireAuth>
    ),
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/garden-profile",
        element: <GardenProfile />,
      },
      {
        path: "/monitoring",
        element: <EnvironmentalMonitoring />,
      },
      {
        path: "/recommendations",
        element: <AIRecommendations />,
      },
      {
        path: "/actuators",
        element: <Actuators />,
      },
      {
        path: "/devices",
        element: <Navigate to="/actuators" replace />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
