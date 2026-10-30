import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ZoneDetail } from "./pages/ZoneDetail";
import { Alerts } from "./pages/Alerts";
import { Devices } from "./pages/Devices";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import LandingPage from "./pages/LandingPage";

export const router = createBrowserRouter([
  // Public landing page
  {
    path: "/",
    element: <LandingPage />,
  },

  // Authentication
  {
    path: "/login",
    element: <Login />,
  },

  // Internal application
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "zones/:id",
        element: <ZoneDetail />,
      },
      {
        path: "alerts",
        element: <Alerts />,
      },
      {
        path: "devices",
        element: <Devices />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
]);