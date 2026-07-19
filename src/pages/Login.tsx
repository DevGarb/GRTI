import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Headset,
  Loader2,
  LockKeyhole,
  QrCode,
  Rocket,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import logoBranco from "@/assets/logo-branco.png";
import AuroraBackground from "@/components/login/AuroraBackground";
import ParticleField from "@/components/login/ParticleField";

const SUPPORT_PHONE_DISPLAY = "(85) 98151-9958";
const SUPPORT_PHONE_E164 = "5585981519958";
const APP_VERSION = "v2.0";

const FEATURES = [
  { icon: Headset, label: "Chamados", desc: "Suporte ágil" },
  { icon: QrCode, label: "Patrimônio", desc: "Ativos rastreados" },
  { icon: ShieldCheck, label: "Preventivas", desc: "Zero surpresas" },
  { icon: Rocket, label: "Projetos", desc: "Sprints no ritmo" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(username.toLowerCase().trim(), password);
    if (error) {
      toast.error("Login ou senha inválidos.");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      // Honor ?next=/path (used by MCP OAuth consent flow).
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
      if (safeNext) {
        window.location.href = safeNext;
        return;
      }
      if (session?.user) {
        const { data: memberships } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", session.user.id);
        if ((memberships || []).length > 1) {
          navigate("/escolher-organizacao");
        } else {
          const [{ data: globalRoles }, { data: orgRoles }] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", session.user.id),
            supabase.from("user_organization_roles").select("role").eq("user_id", session.user.id),
          ]);
          const roles = [
            ...(globalRoles || []).map((r: { role: string }) => r.role),
            ...(orgRoles || []).map((r: { role: string }) => r.role),
          ];
          const isAdmin = roles.includes("admin") || roles.includes("super_admin");
          navigate(isAdmin ? "/" : "/chamados");
        }
      } else {
        navigate("/chamados");
      }
    }
    setLoading(false);
  };

  const resetUrl = `https://wa.me/${SUPPORT_PHONE_E164}?text=${encodeURIComponent(
    `Olá, gostaria de solicitar uma nova senha para o sistema GRTI.\nMeu login: ${username || "(informe aqui)"}`
  )}`;

  return (
    <div className="relative min-h-screen w-full flex flex-col text-white overflow-hidden">
      <AuroraBackground />
      <ParticleField className="absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 px-6 py-12 lg:px-20">
        {/* Brand panel */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-xl lg:flex-1 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <motion.img
            variants={rise}
            src={logoBranco}
            alt="Grupo Ramos"
            className="w-56 sm:w-72 lg:w-80 h-auto object-contain drop-shadow-[0_0_35px_hsl(207_90%_55%/0.35)]"
          />

          <motion.div
            variants={rise}
            className="mt-8 hidden sm:flex items-center gap-3 font-mono-tech text-[11px] uppercase tracking-[0.25em] text-cyan-300/80"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Central de tecnologia · online
          </motion.div>

          <motion.h1
            variants={rise}
            className="font-display mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.1] text-white"
          >
            A operação de TI do{" "}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              Grupo Ramos
            </span>
            , em um só lugar.
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-5 max-w-md text-base sm:text-lg font-light text-slate-300/90 leading-relaxed"
          >
            Gestão unificada e suporte rápido para todo o ecossistema do Grupo Ramos.
          </motion.p>

          <motion.ul
            variants={rise}
            className="mt-10 hidden lg:grid grid-cols-2 gap-3 w-full max-w-md"
          >
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <li
                key={label}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-3 transition-colors hover:border-cyan-400/40 hover:bg-white/[0.07]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{label}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        </motion.section>

        {/* Form panel */}
        <motion.main
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
          className="w-full max-w-md lg:w-[420px] lg:shrink-0"
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_24px_80px_-20px_hsl(220_45%_2%/0.9)] overflow-hidden">
            {/* Gradient hairline on top of the card */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

            <div className="p-8 sm:p-10">
              <div className="space-y-2">
                <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">
                  Acesso restrito
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
                  Bem-vindo de volta
                </h2>
                <p className="text-sm font-light text-slate-400">
                  Entre com suas credenciais para acessar o GRTI
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2 group">
                  <label
                    htmlFor="username"
                    className="block px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-cyan-300"
                  >
                    Usuário
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="username"
                      placeholder="nome.sobrenome"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:shadow-[0_0_24px_-6px_hsl(188_95%_58%/0.45)] lowercase"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label
                    htmlFor="password"
                    className="block px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-cyan-300"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3.5 pl-12 pr-12 text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:shadow-[0_0_24px_-6px_hsl(188_95%_58%/0.45)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-cyan-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <a
                      href={resetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-sky-400 transition-colors hover:text-cyan-300"
                    >
                      Esqueci minha senha
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] py-4 px-6 font-bold text-white shadow-[0_12px_40px_-10px_hsl(199_95%_50%/0.6)] transition-all hover:shadow-[0_16px_48px_-10px_hsl(199_95%_55%/0.8)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[110%] group-hover/btn:opacity-100" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Autenticando..." : "Entrar no sistema"}
                  </span>
                </button>
              </form>

              <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
                Conexão protegida · acesso monitorado
              </p>
            </div>
          </div>
        </motion.main>
      </div>

      <footer className="relative z-10 flex justify-center px-4 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
            GRTI {APP_VERSION}
          </span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <a
            href={`https://wa.me/${SUPPORT_PHONE_E164}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium uppercase tracking-tight text-slate-400 transition-colors hover:text-cyan-300"
          >
            Suporte {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
      </footer>
    </div>
  );
}
