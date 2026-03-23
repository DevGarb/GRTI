import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function OrgSwitcher() {
  const { profile, isSuperAdmin } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase
      .from("organizations")
      .select("id, name, logo_url")
      .order("name")
      .then(({ data }) => {
        if (data) setOrgs(data);
      });
  }, [isSuperAdmin]);

  if (!isSuperAdmin || orgs.length === 0) return null;

  const currentOrgId = profile?.organization_id;
  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  const switchOrg = async (orgId: string | null) => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: orgId })
      .eq("user_id", profile.user_id);

    if (error) {
      toast.error("Erro ao trocar organização");
    } else {
      toast.success(orgId ? `Organização alterada para ${orgs.find(o => o.id === orgId)?.name}` : "Visualizando todas as organizações");
      // Reload to re-fetch all context
      window.location.reload();
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-sidebar-accent/30 hover:bg-sidebar-accent/50 text-sidebar-foreground transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">
          {currentOrg?.name || "Todas organizações"}
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto animate-scale-in origin-top">
            <button
              onClick={() => switchOrg(null)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted transition-colors",
                !currentOrgId && "font-semibold text-primary"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Todas organizações</span>
              {!currentOrgId && <Check className="h-3 w-3" />}
            </button>
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrg(org.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted transition-colors",
                  currentOrgId === org.id && "font-semibold text-primary"
                )}
              >
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="h-4 w-4 rounded object-contain" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                <span className="flex-1 text-left truncate">{org.name}</span>
                {currentOrgId === org.id && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
