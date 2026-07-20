import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type ManutencaoProfileType = "admin" | "tecnico" | "solicitante";

export interface ManutencaoProfile {
  type: ManutencaoProfileType;
  id?: string;        // mechanic.id or requester.id (undefined for admin)
  name: string;
  phone?: string | null;
}

interface Ctx {
  profile: ManutencaoProfile | null;
  setProfile: (p: ManutencaoProfile | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "cgps.manutencao.profile";
export const ManutencaoProfileCtx = createContext<Ctx | undefined>(undefined);

export function ManutencaoProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<ManutencaoProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ManutencaoProfile) : null;
    } catch { return null; }
  });

  const setProfile = useCallback((p: ManutencaoProfile | null) => {
    setProfileState(p);
    try {
      if (p) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clear = useCallback(() => setProfile(null), [setProfile]);

  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setProfileState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  return (
    <ManutencaoProfileCtx.Provider value={{ profile, setProfile, clear }}>
      {children}
    </ManutencaoProfileCtx.Provider>
  );
}

export function useManutencaoProfile() {
  const ctx = useContext(ManutencaoProfileCtx);
  if (!ctx) throw new Error("useManutencaoProfile must be used within ManutencaoProfileProvider");
  return ctx;
}
