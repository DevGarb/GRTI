import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardPadrao from "@/pages/dashboard/DashboardPadrao";
import DashboardOperacional from "@/pages/dashboard/DashboardOperacional";

export default function Dashboard() {
  const { profile } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.organization_id) { setSlug(null); setLoaded(true); return; }
      const { data } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", profile.organization_id)
        .maybeSingle();
      if (!cancelled) {
        setSlug(data?.slug ?? null);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.organization_id]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return slug === "cgps-operacional" ? <DashboardOperacional /> : <DashboardPadrao />;
}
