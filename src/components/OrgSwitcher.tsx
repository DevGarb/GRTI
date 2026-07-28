import { useState, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  persistActiveOrgSlug,
  readOrgSlugFromUrl,
  resolveActiveOrgSlug,
} from "@/lib/activeOrg";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

export default function OrgSwitcher() {
  const { profile, isSuperAdmin } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncedFromUrl, setSyncedFromUrl] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    let cancelled = false;

    const load = async () => {
      setFetching(true);
      setError(null);
      try {
        if (isSuperAdmin) {
          const { data, error } = await supabase
            .from("organizations")
            .select("id, name, slug, logo_url")
            .order("name");
          if (error) throw error;
          if (!cancelled) setOrgs(data || []);
          return;
        }

        const { data: rolesData, error: rolesErr } = await supabase
          .from("user_organization_roles")
          .select("organization_id")
          .eq("user_id", profile.user_id);
        if (rolesErr) throw rolesErr;

        const orgIds = Array.from(
          new Set(
            (rolesData || [])
              .map((r: { organization_id: string }) => r.organization_id)
              .filter(Boolean)
          )
        );
        if (orgIds.length === 0) {
          if (!cancelled) setOrgs([]);
          return;
        }

        const { data, error: orgsErr } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .in("id", orgIds)
          .order("name");
        if (orgsErr) throw orgsErr;
        if (!cancelled) setOrgs(data || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar organizações");
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, isSuperAdmin]);

  const currentOrgId = profile?.organization_id ?? null;
  const currentOrg = useMemo(() => orgs.find((o) => o.id === currentOrgId) ?? null, [orgs, currentOrgId]);

  // Sincronia inicial: se veio ?org=slug (ou localStorage) diferente do que está no
  // profile, força o switch. Também mantém a URL/storage alinhados com a org atual.
  useEffect(() => {
    if (fetching || orgs.length === 0 || syncedFromUrl) return;
    setSyncedFromUrl(true);

    const desiredSlug = resolveActiveOrgSlug();
    if (desiredSlug) {
      const target = orgs.find((o) => o.slug === desiredSlug);
      if (target && target.id !== currentOrgId) {
        // O usuário abriu um link compartilhado apontando para outra org à qual ele tem acesso.
        void switchOrg(target.id, { silent: true });
        return;
      }
    }

    // Nada a trocar — só garante que a URL/storage refletem a org atual.
    if (currentOrg?.slug) {
      persistActiveOrgSlug(currentOrg.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching, orgs, currentOrgId]);

  const switchOrg = async (orgId: string | null, opts?: { silent?: boolean }) => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const target = orgId ? orgs.find((o) => o.id === orgId) ?? null : null;

    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: orgId })
      .eq("user_id", profile.user_id);

    if (error) {
      setError("Não foi possível trocar de organização.");
      toast.error("Erro ao trocar organização");
      setLoading(false);
      return;
    }

    // Persiste antes do reload para que os hooks já leiam a nova org.
    persistActiveOrgSlug(target?.slug ?? null);

    if (!opts?.silent) {
      toast.success(
        target ? `Organização alterada para ${target.name}` : "Visualizando todas as organizações"
      );
    }
    // Reload para reconstruir todo o contexto (React Query, roles, menus).
    window.location.reload();
  };

  // Escuta navegações que alterem ?org= via history push/pop (links internos).
  useEffect(() => {
    const onPop = () => {
      const slug = readOrgSlugFromUrl();
      if (!slug || fetching) return;
      const target = orgs.find((o) => o.slug === slug);
      if (target && target.id !== currentOrgId) void switchOrg(target.id, { silent: true });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, currentOrgId, fetching]);

  if (fetching) {
    return (
      <div className="px-3 mb-2">
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-sidebar-accent/20 text-sidebar-foreground/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="truncate">Carregando organizações…</span>
        </div>
      </div>
    );
  }

  if (error && orgs.length === 0) {
    return (
      <div className="px-3 mb-2">
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-destructive/10 text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="truncate">{error}</span>
        </div>
      </div>
    );
  }

  if (orgs.length === 0) return null;
  if (!isSuperAdmin && orgs.length < 2) return null;

  return (
    <div className="relative px-3 mb-2">
      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        Selecione a organização
      </div>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        aria-busy={loading}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-sidebar-accent/30 hover:bg-sidebar-accent/50 text-sidebar-foreground transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="flex-1 text-left truncate">
          {loading ? "Trocando organização…" : currentOrg?.name || "Todas organizações"}
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {error && !loading && (
        <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto animate-scale-in origin-top">
            {isSuperAdmin && (
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
            )}
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
