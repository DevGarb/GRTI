import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { toast } from "sonner";
import AuroraBackground from "@/components/login/AuroraBackground";
import ParticleField from "@/components/login/ParticleField";

const ORG_DESCRIPTIONS: Record<string, { subtitle: string; sector: string }> = {
  "grupo-ramos": { subtitle: "Suporte e Help Desk", sector: "Setor de T.I" },
  "cgps-operacional": { subtitle: "Entregas, Oficina e Manutenção", sector: "Setor de Operações" },
  "grcheck": { subtitle: "Checklists e Auditoria de Setores", sector: "Gestão de Qualidade" },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <AuroraBackground />
        <div className="relative z-10 h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-6 text-white">
        <AuroraBackground />
        <ParticleField className="absolute inset-0 h-full w-full" />
        <div className="relative z-10 text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md">
            <Building2 className="h-8 w-8 text-cyan-300" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Sem organização vinculada</h1>
          <p className="text-sm font-light text-slate-400 mb-6">
            Sua conta ainda não está associada a nenhuma organização. Entre em contato com o administrador.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-md transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col text-white overflow-hidden">
      <AuroraBackground />
      <ParticleField className="absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-4xl"
        >
          <motion.div variants={rise} className="text-center mb-4">
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">
              Selecione o ambiente
            </p>
          </motion.div>

          <motion.h1
            variants={rise}
            className="font-display text-center text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
          >
            Escolha a{" "}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              organização
            </span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="text-center text-base font-light text-slate-300/90 mb-12"
          >
            Para qual demanda você quer abrir um chamado hoje?
          </motion.p>

          <div className="grid gap-6 sm:grid-cols-2">
            {orgs.map((org) => {
              const meta = ORG_DESCRIPTIONS[org.slug] || { subtitle: "", sector: "" };
              return (
                <motion.button
                  key={org.id}
                  variants={rise}
                  onClick={() => choose(org.id)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-8 text-left shadow-[0_24px_80px_-20px_hsl(220_45%_2%/0.9)] transition-all hover:border-cyan-400/40 hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_28px_90px_-20px_hsl(199_95%_50%/0.25)] active:scale-[0.99]"
                >
                  {/* Gradient hairline on top of the card */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-400/20 bg-gradient-to-br from-sky-500/20 to-cyan-400/10">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-8 w-8 text-cyan-300" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-white">{org.name}</h2>
                      {meta.sector && <p className="text-sm text-slate-400">{meta.sector}</p>}
                    </div>
                  </div>

                  {meta.subtitle && (
                    <p className="text-sm font-light text-slate-400 mb-5">{meta.subtitle}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-sm font-medium text-sky-400 transition-colors group-hover:text-cyan-300">
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.div variants={rise} className="mt-12 flex justify-center">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-400 backdrop-blur-md transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
