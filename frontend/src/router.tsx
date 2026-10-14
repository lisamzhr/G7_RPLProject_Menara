import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ZoneDetail } from "./pages/ZoneDetail";
import { Alerts } from "./pages/Alerts";
import { Devices } from "./pages/Devices";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
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
