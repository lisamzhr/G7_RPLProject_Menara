import { createBrowserRouter } from "react-router-dom";

import { Dashboard } from "./pages/Dashboard";
import { GardenProfile } from "./pages/GardenProfile";
import { EnvironmentalMonitoring } from "./pages/EnvironmentalMonitoring";
import { AIRecommendations } from "./pages/AIRecommendations";
import { Devices } from "./pages/Devices";
import { Settings } from "./pages/Settings";

import { Login } from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";

export const router = createBrowserRouter([
  // Public Landing Page
  {
    path: "/",
    element: <LandingPage />,
  },

  // Authentication
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },

  // MENARA Dashboard
  {
    path: "/dashboard",
    element: <Dashboard />,
  },

  // Garden Profile
  {
    path: "/garden-profile",
    element: <GardenProfile />,
  },

  // Environmental Monitoring
  {
    path: "/monitoring",
    element: <EnvironmentalMonitoring />,
  },

  // AI Recommendations
  {
    path: "/recommendations",
    element: <AIRecommendations />,
  },

  // Device Control
  {
    path: "/devices",
    element: <Devices />,
  },

  // Settings
  {
    path: "/settings",
    element: <Settings />,
  },
]);
