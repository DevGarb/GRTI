import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type EntregasProfileType = "admin" | "motorista" | "solicitante";

export interface EntregasProfile {
  type: EntregasProfileType;
  id?: string;        // driver.id or requester.id (undefined for admin)
  name: string;
  phone?: string | null;
}

interface Ctx {
  profile: EntregasProfile | null;
  setProfile: (p: EntregasProfile | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "cgps.entregas.profile";
const EntregasProfileCtx = createContext<Ctx | undefined>(undefined);

export function EntregasProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<EntregasProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as EntregasProfile) : null;
    } catch { return null; }
  });

  const setProfile = useCallback((p: EntregasProfile | null) => {
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
    <EntregasProfileCtx.Provider value={{ profile, setProfile, clear }}>
      {children}
    </EntregasProfileCtx.Provider>
  );
}

export function useEntregasProfile() {
  const ctx = useContext(EntregasProfileCtx);
  if (!ctx) throw new Error("useEntregasProfile must be used within EntregasProfileProvider");
  return ctx;
}
