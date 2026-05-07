import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ORG_DESCRIPTIONS: Record<string, { subtitle: string; sector: string }> = {
  grti: { subtitle: "Suporte e Help Desk", sector: "Setor de T.I" },
  operacional: { subtitle: "Entregas, Oficina e Manutenção", sector: "Setor de Operações" },
};

export default function EscolherOrganizacao() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { orgs, loading, switchToOrg } = useUserOrganizations();

  // If only 1 org, auto-select and bounce
  useEffect(() => {
    if (loading) return;
    if (orgs.length === 1 && profile && profile.organization_id !== orgs[0].id) {
      switchToOrg(orgs[0].id).then(() => window.location.replace("/"));
    } else if (orgs.length === 1) {
      navigate("/", { replace: true });
    }
  }, [loading, orgs, profile?.organization_id]);

  const choose = async (orgId: string) => {
    const { error } = await switchToOrg(orgId);
    if (error) { toast.error("Erro ao selecionar organização"); return; }
    window.location.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Sem organização vinculada</h1>
          <p className="text-muted-foreground mb-6">Sua conta ainda não está associada a nenhuma organização. Entre em contato com o administrador.</p>
          <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Escolha a organização</h1>
          <p className="text-muted-foreground">Para qual demanda você quer abrir um chamado hoje?</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {orgs.map((org) => {
            const meta = ORG_DESCRIPTIONS[org.slug] || { subtitle: "", sector: "" };
            return (
              <button
                key={org.id}
                onClick={() => choose(org.id)}
                className="group relative bg-card border-2 border-border hover:border-primary rounded-2xl p-8 text-left transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{org.name}</h2>
                    {meta.sector && <p className="text-sm text-muted-foreground">{meta.sector}</p>}
                  </div>
                </div>
                {meta.subtitle && (
                  <p className="text-sm text-muted-foreground mb-4">{meta.subtitle}</p>
                )}
                <div className="text-sm font-medium text-primary group-hover:underline">
                  Entrar →
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
