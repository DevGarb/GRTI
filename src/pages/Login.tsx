import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(username.toLowerCase().trim(), password);
    if (error) {
      toast.error("Login ou senha inválidos.");
    } else {
      // Check roles to determine redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const roles = (userRoles || []).map(r => r.role);
        const isAdmin = roles.includes("admin") || roles.includes("super_admin");
        navigate(isAdmin ? "/" : "/chamados");
      } else {
        navigate("/chamados");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">GR</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">GRTI</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Login</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 uppercase"
              placeholder="NOME.SOBRENOME"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
