import { lazy, Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  useLocation,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GardenProfile = lazy(() => import("./pages/GardenProfile"));
const EnvironmentalMonitoring = lazy(
  () => import("./pages/EnvironmentalMonitoring")
);
const AIRecommendations = lazy(() => import("./pages/AIRecommendations"));
const Actuators = lazy(() => import("./pages/Actuators"));
const Settings = lazy(() => import("./pages/Settings"));

const AuthenticatedShell = lazy(async () => {
  const [{ GardenProvider }, { default: Layout }] = await Promise.all([
    import("./context/GardenContext"),
    import("./components/layout/Layout"),
  ]);

  return {
    default: function Shell() {
      return (
        <GardenProvider>
          <Layout />
        </GardenProvider>
      );
    },
  };
});

function withSuspense(node: ReactNode) {
  return (
    <Suspense
      fallback={
        <div
          style={{ minHeight: "100vh", background: "#f5f3e9" }}
          aria-busy="true"
        />
      }
    >
      {node}
    </Suspense>
  );
}

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
    element: withSuspense(<Login />),
  },
  {
    path: "/register",
    element: withSuspense(<Register />),
  },
  {
    element: (
      <RequireAuth>
        {withSuspense(<AuthenticatedShell />)}
      </RequireAuth>
    ),
    children: [
      {
        path: "/dashboard",
        element: withSuspense(<Dashboard />),
      },
      {
        path: "/garden-profile",
        element: withSuspense(<GardenProfile />),
      },
      {
        path: "/monitoring",
        element: withSuspense(<EnvironmentalMonitoring />),
      },
      {
        path: "/recommendations",
        element: withSuspense(<AIRecommendations />),
      },
      {
        path: "/actuators",
        element: withSuspense(<Actuators />),
      },
      {
        path: "/devices",
        element: <Navigate to="/actuators" replace />,
      },
      {
        path: "/settings",
        element: withSuspense(<Settings />),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
