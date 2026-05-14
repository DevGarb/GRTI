import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const SUPPORT_PHONE_DISPLAY = "(85) 98151-9958";
const SUPPORT_PHONE_E164 = "5585981519958";
const APP_VERSION = "v2.0";

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
            ...(globalRoles || []).map((r: any) => r.role),
            ...(orgRoles || []).map((r: any) => r.role),
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
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* Brand panel */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center p-16 bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.7)]"
      >
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, hsl(var(--primary-foreground)) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl bg-primary-foreground/10" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl bg-primary-foreground/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative z-10 text-primary-foreground max-w-md"
        >
          <div className="mb-10 w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black border border-primary-foreground/20 shadow-2xl bg-primary-foreground/15 backdrop-blur-xl">
            GR
          </div>
          <h1 className="text-6xl font-black mb-6 tracking-tighter">GRTI</h1>
          <div className="h-1 w-20 bg-primary-foreground/40 mb-8 rounded-full" />
          <p className="text-xl text-primary-foreground/90 leading-relaxed font-light">
            Gestão inteligente e suporte ágil para o seu helpdesk multi-tenant.
          </p>
        </motion.div>
      </motion.aside>

      {/* Form panel */}
      <main className="relative w-full md:w-1/2 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-sm space-y-10"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center mb-2">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-2xl font-black text-primary-foreground mb-4">
              GR
            </div>
            <h2 className="text-2xl font-bold tracking-tight">GRTI</h2>
          </div>

          <div className="space-y-2">
            <h3 className="text-4xl font-bold tracking-tight">Login</h3>
            <p className="text-muted-foreground font-light">
              Entre com suas credenciais de acesso
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label
                htmlFor="username"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block px-1 group-focus-within:text-primary transition-colors"
              >
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                placeholder="NOME.SOBRENOME"
                className="w-full px-5 py-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all uppercase"
              />
            </div>

            <div className="space-y-2 group">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block px-1 group-focus-within:text-primary transition-colors"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-5 py-4 pr-12 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <a
                  href={resetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:opacity-80 font-medium transition-opacity"
                >
                  Esqueci minha senha?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar no sistema"}
            </button>
          </form>
        </motion.div>

        <footer className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 rounded-full border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              GRTI {APP_VERSION}
            </span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <a
              href={`https://wa.me/${SUPPORT_PHONE_E164}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-tight"
            >
              Suporte {SUPPORT_PHONE_DISPLAY}
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
