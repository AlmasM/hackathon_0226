import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UserProfile } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface UserProfileContextValue {
  activeProfile: UserProfile | null;
  setActiveProfile: (profile: UserProfile | null) => void;
  profiles: UserProfile[];
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<UserProfile | null>(
    null,
  );

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch(`${API_BASE}/api/user-profiles`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.profiles ?? []);
          setProfiles(list);
          const vegan = list.find(
            (p: UserProfile) => p.persona_type === "vegan",
          );
          setActiveProfileState(vegan ?? list[0] ?? null);
        }
      } catch {
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  const setActiveProfile = useCallback((profile: UserProfile | null) => {
    setActiveProfileState(profile);
  }, []);

  const value: UserProfileContextValue = {
    activeProfile,
    setActiveProfile,
    profiles,
    loading,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
