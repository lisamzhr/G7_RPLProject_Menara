import { API_BASE_URL } from "../lib/constants";
import {
  Garden,
  GardenCreate,
  GardenMember,
  PlantCategory,
  PlantZone,
  ZoneCreate,
  ZoneStatus,
  Reading,
  DashboardSummary,
  AlertItem,
  ActuatorItem,
  SensorNodeItem,
  SensorNodeRegisterPayload,
  UserProfile,
  UpdateProfileRequest,
  RecommendationItem,
} from "../types";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token =
    localStorage.getItem("roofgarden_token") ||
    sessionStorage.getItem("roofgarden_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Read response body once, whether success or error.
  const responseText = await res.text();
  let data: any = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;

    if (typeof data === "string" && data) {
      message = data;
    } else if (data?.detail) {
      message =
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    }

    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // AUTH: REGISTER
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  // AUTH: LOGIN
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // AUTH: RESET PASSWORD
  resetPassword: (new_password: string) =>
    request<{ email: string; status: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),

  // AUTH: CURRENT USER & PROFILE
  getMe: () => request<UserProfile>("/auth/me"),

  updateProfile: (payload: UpdateProfileRequest) =>
    request<UserProfile>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // GARDENS & CATEGORIES
  getGardens: () => request<Garden[]>("/gardens"),

  getCategories: () => request<PlantCategory[]>("/gardens/categories"),

  createGarden: (payload: GardenCreate) =>
    request<Garden>("/gardens", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteGarden: (gardenId: string) =>
    request<void>(`/gardens/${gardenId}`, {
      method: "DELETE",
    }),

  getGardenMembers: (gardenId: string) =>
    request<GardenMember[]>(`/gardens/${gardenId}/members`),

  addGardenMember: (gardenId: string, email: string) =>
    request<GardenMember>(`/gardens/${gardenId}/members`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  removeGardenMember: (gardenId: string, userId: string) =>
    request<void>(`/gardens/${gardenId}/members/${userId}`, {
      method: "DELETE",
    }),

  getZones: (gardenId: string) =>
    request<PlantZone[]>(`/gardens/${gardenId}/zones`),

  createZone: (gardenId: string, payload: ZoneCreate) =>
    request<PlantZone>(`/gardens/${gardenId}/zones`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteZone: (zoneId: string) =>
    request<void>(`/zones/${zoneId}`, {
      method: "DELETE",
    }),

  getZoneStatus: (zoneId: string) =>
    request<ZoneStatus>(`/zones/${zoneId}/status`),

  getZoneReadings: (
    zoneId: string,
    range: "24h" | "7d" | "30d" = "24h",
    agg: "raw" | "hourly" = "raw"
  ) =>
    request<Reading[]>(
      `/zones/${zoneId}/readings?range=${range}&agg=${agg}`
    ),

  evaluateZone: (zoneId: string) =>
    request<RecommendationItem>(`/zones/${zoneId}/evaluate`, {
      method: "POST",
    }),

  // SENSOR NODES
  getNodes: (zoneId?: string) =>
    request<SensorNodeItem[]>(
      zoneId ? `/nodes?zone_id=${encodeURIComponent(zoneId)}` : "/nodes"
    ),

  registerNode: (zoneId: string, payload: SensorNodeRegisterPayload) =>
    request<SensorNodeItem>(`/zones/${zoneId}/nodes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteNode: (nodeId: string) =>
    request<void>(`/nodes/${nodeId}`, {
      method: "DELETE",
    }),

  getDashboardSummary: (gardenId?: string) =>
    request<DashboardSummary>(
      gardenId
        ? `/dashboard/summary?garden_id=${encodeURIComponent(gardenId)}`
        : "/dashboard/summary"
    ),

  // ALERTS
  getAlerts: (params?: { zoneId?: string; status?: "active" | "resolved" | "all" }) => {
    const searchParams = new URLSearchParams();
    if (params?.zoneId) searchParams.set("zone_id", params.zoneId);
    if (params?.status) searchParams.set("status", params.status);
    const query = searchParams.toString();
    return request<AlertItem[]>(query ? `/alerts?${query}` : "/alerts");
  },

  confirmAlert: (alertId: string, comment?: string) =>
    request<{ status: string }>(`/alerts/${alertId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),

  overrideAlert: (alertId: string, comment?: string) =>
    request<{ status: string }>(`/alerts/${alertId}/override`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),

  // ACTUATORS
  getActuators: (zoneId?: string) =>
    request<ActuatorItem[]>(
      zoneId ? `/actuators?zone_id=${encodeURIComponent(zoneId)}` : "/actuators"
    ),

  commandActuator: (
    actuatorId: string,
    command: "turn_on" | "turn_off",
    duration_seconds = 30
  ) =>
    request<{ status: string; command_id: string }>(
      `/actuators/${actuatorId}/command`,
      {
        method: "POST",
        body: JSON.stringify({ command, duration_seconds }),
      }
    ),

  // AI RECOMMENDATIONS
  getRecommendations: (zoneId?: string) =>
    request<RecommendationItem[]>(
      zoneId
        ? `/recommendations?zone_id=${encodeURIComponent(zoneId)}`
        : "/recommendations"
    ),
};
