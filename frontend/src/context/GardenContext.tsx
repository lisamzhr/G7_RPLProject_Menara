import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Garden, PlantCategory, PlantZone, UserProfile } from "../types";

interface GardenContextType {
  gardens: Garden[];
  selectedGarden: Garden | null;
  setSelectedGarden: (garden: Garden | null) => void;
  zones: PlantZone[];
  selectedZone: PlantZone | null;
  setSelectedZone: (zone: PlantZone | null) => void;
  categories: PlantCategory[];
  userProfile: UserProfile | null;
  loading: boolean;
  error: string;
  refreshGardens: () => Promise<void>;
  refreshZones: (gardenId?: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const GardenContext = createContext<GardenContextType | undefined>(undefined);

const SELECTED_GARDEN_KEY = "roofgarden_selected_garden_id";
const SELECTED_ZONE_KEY = "roofgarden_selected_zone_id";

export const GardenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGarden, setSelectedGardenState] = useState<Garden | null>(null);
  const [zones, setZones] = useState<PlantZone[]>([]);
  const [selectedZone, setSelectedZoneState] = useState<PlantZone | null>(null);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem("roofgarden_user") || sessionStorage.getItem("roofgarden_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("roofgarden_token");
    sessionStorage.removeItem("roofgarden_token");
    localStorage.removeItem("roofgarden_user");
    sessionStorage.removeItem("roofgarden_user");
    localStorage.removeItem(SELECTED_GARDEN_KEY);
    localStorage.removeItem(SELECTED_ZONE_KEY);
    setUserProfile(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUserProfile(me);
      const json = JSON.stringify(me);
      if (localStorage.getItem("roofgarden_token")) {
        localStorage.setItem("roofgarden_user", json);
      } else {
        sessionStorage.setItem("roofgarden_user", json);
      }
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn("Could not fetch plant categories:", err);
    }
  }, []);

  const setSelectedGarden = (garden: Garden | null) => {
    setSelectedGardenState(garden);
    if (garden) {
      localStorage.setItem(SELECTED_GARDEN_KEY, garden.id);
    } else {
      localStorage.removeItem(SELECTED_GARDEN_KEY);
    }
  };

  const setSelectedZone = (zone: PlantZone | null) => {
    setSelectedZoneState(zone);
    if (zone) {
      localStorage.setItem(SELECTED_ZONE_KEY, zone.id);
    } else {
      localStorage.removeItem(SELECTED_ZONE_KEY);
    }
  };

  const refreshZones = useCallback(async (gardenId?: string) => {
    const targetGardenId = gardenId || selectedGarden?.id;
    if (!targetGardenId) {
      setZones([]);
      setSelectedZoneState(null);
      return;
    }

    try {
      const zoneList = await api.getZones(targetGardenId);
      setZones(zoneList);

      const savedZoneId = localStorage.getItem(SELECTED_ZONE_KEY);
      const matched = zoneList.find((z) => z.id === savedZoneId);
      setSelectedZoneState(matched || zoneList[0] || null);
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    }
  }, [selectedGarden]);

  const refreshGardens = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const gardenList = await api.getGardens();
      setGardens(gardenList);

      const savedGardenId = localStorage.getItem(SELECTED_GARDEN_KEY);
      const matched = gardenList.find((g) => g.id === savedGardenId);
      const current = matched || gardenList[0] || null;
      setSelectedGardenState(current);

      if (current) {
        localStorage.setItem(SELECTED_GARDEN_KEY, current.id);
        const zoneList = await api.getZones(current.id);
        setZones(zoneList);

        const savedZoneId = localStorage.getItem(SELECTED_ZONE_KEY);
        const matchedZone = zoneList.find((z) => z.id === savedZoneId);
        setSelectedZoneState(matchedZone || zoneList[0] || null);
      } else {
        localStorage.removeItem(SELECTED_GARDEN_KEY);
        localStorage.removeItem(SELECTED_ZONE_KEY);
        setZones([]);
        setSelectedZoneState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gardens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGardens();
    refreshCategories();
    refreshProfile();
  }, [refreshGardens, refreshCategories, refreshProfile]);

  // When selectedGarden changes, load zones
  useEffect(() => {
    if (selectedGarden) {
      refreshZones(selectedGarden.id);
    }
  }, [selectedGarden, refreshZones]);

  return (
    <GardenContext.Provider
      value={{
        gardens,
        selectedGarden,
        setSelectedGarden,
        zones,
        selectedZone,
        setSelectedZone,
        categories,
        userProfile,
        loading,
        error,
        refreshGardens,
        refreshZones,
        refreshCategories,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </GardenContext.Provider>
  );
};

export const useGarden = () => {
  const context = useContext(GardenContext);
  if (!context) {
    throw new Error("useGarden must be used within a GardenProvider");
  }
  return context;
};
