export type StatusLevel = "normal" | "advisory" | "warning";
export type ParameterStatusLevel = "ok" | "low" | "high";
export type PlantCategoryKey = "leafy" | "fruiting_veg" | "herbs" | "fruit_potted";

export interface Garden {
  id: string;
  user_id?: string;
  name: string;
  location_name: string;
  lat: number;
  lon: number;
  elevation_m: number;
  adm4_code: string;
  created_at: string;
}

export interface GardenCreate {
  name: string;
  location_name: string;
  lat: number;
  lon: number;
  elevation_m?: number;
  adm4_code: string;
}

export interface GardenMember {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
}

export interface PlantCategory {
  id: string;
  key: PlantCategoryKey;
  name: string;
  response_timescale: "days" | "weeks";
  threshold_profile?: ThresholdProfile;
}

export interface ZoneCreate {
  category_key: PlantCategoryKey | string;
  label: string;
  plant_names?: string[];
}

export interface ThresholdProfile {
  id: string;
  category_id: string;
  moisture_min: number;
  moisture_max: number;
  temp_min: number;
  temp_max: number;
  humidity_min: number;
  humidity_max: number;
  lux_min: number;
  lux_max: number;
  source_note: string;
}

export interface PlantZone {
  id: string;
  garden_id: string;
  category: PlantCategory;
  label: string;
  plant_names: string[];
  created_at: string;
}

export interface ParameterMetric {
  value: number;
  status: ParameterStatusLevel;
  ideal_min: number;
  ideal_max: number;
  unit: string;
}

export interface ParameterStatusMap {
  moisture: ParameterMetric;
  temperature: ParameterMetric;
  humidity: ParameterMetric;
  lux: ParameterMetric;
}

export interface Reading {
  ts: string;
  soil_moisture_pct: number;
  temperature_c: number;
  humidity_pct: number;
  lux: number;
  battery_v?: number;
  is_valid?: boolean;
}

export interface RecommendationItem {
  id: string;
  zone_id: string;
  status_level: StatusLevel;
  message: string;
  reasons: string[];
  created_at: string;
}

export interface ZoneStatus {
  zone_id: string;
  zone_label: string;
  category_key: PlantCategoryKey;
  overall_status: StatusLevel;
  latest_reading?: Reading;
  parameter_status: ParameterStatusMap;
  latest_recommendation?: RecommendationItem | {
    id: string;
    zone_id?: string;
    status_level: StatusLevel;
    message: string;
    reasons: string[];
    created_at: string;
  };
}

export interface WeatherSummary {
  location: string;
  forecast: string;
  temp_c: number;
  rain_probability_pct: number;
  attribution: string;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  icon_url?: string;
  local_datetime?: string;
}

export interface DashboardSummary {
  total_zones: number;
  zones_ok: number;
  zones_need_attention: number;
  active_alerts_count: number;
  weather_summary: WeatherSummary;
  top_recommendations: {
    zone_id: string;
    zone_label: string;
    status_level: StatusLevel;
    message: string;
  }[];
}

export interface AlertItem {
  id: string;
  zone_id: string;
  zone_label?: string;
  level: StatusLevel;
  type: string;
  message: string;
  requires_confirmation: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface SensorNodeItem {
  id: string;
  mac_address?: string | null;
  name?: string | null;
  zone_id: string;
  zone_label?: string;
  last_seen_at: string | null;
  status: "active" | "offline" | "maintenance" | string;
  created_at?: string | null;
}

export interface SensorNodeRegisterPayload {
  mac_address: string;
  name?: string;
}

export interface ActuatorItem {
  id: string;
  zone_id: string;
  type: "sprinkler" | "shade_net" | "grow_light";
  driver: "relay" | "mock";
  max_on_seconds: number;
  min_interval_minutes: number;
  last_action?: {
    command: string;
    source: "auto" | "user" | "human_confirmed";
    status: "pending" | "sent" | "acked" | "failed";
    executed_at: string | null;
  };
}
