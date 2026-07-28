import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { OficinaRole } from "@/lib/oficinaRoles";

export interface OficinaProfile {
  type: OficinaRole;
  id?: string; // op_mechanics.id (undefined para admin do sistema)
  name: string;
  phone?: string | null;
}

interface Ctx {
  profile: OficinaProfile | null;
  setProfile: (p: OficinaProfile | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "cgps.oficina.profile";
export const OficinaProfileCtx = createContext<Ctx | undefined>(undefined);

export function OficinaProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<OficinaProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OficinaProfile) : null;
    } catch { return null; }
  });

  const setProfile = useCallback((p: OficinaProfile | null) => {
    setProfileState(p);
    try {
      if (p) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clear = useCallback(() => setProfile(null), [setProfile]);

  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setProfileState(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  return (
    <OficinaProfileCtx.Provider value={{ profile, setProfile, clear }}>
      {children}
    </OficinaProfileCtx.Provider>
  );
}

export function useOficinaProfile() {
  const ctx = useContext(OficinaProfileCtx);
  if (!ctx) throw new Error("useOficinaProfile must be used within OficinaProfileProvider");
  return ctx;
}
