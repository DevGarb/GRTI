import { useState } from "react";
import { Sun, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Configuracoes() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dark-mode");
    if (saved !== null) return saved === "true";
    return document.documentElement.classList.contains("dark");
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { user, profile } = useAuth();

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("dark-mode", String(next));
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {/* Appearance */}
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Aparência</h2>
            <p className="text-[12px] text-muted-foreground">Alternar entre tema claro e escuro</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Tema Escuro</span>
          <button
            onClick={toggleDark}
            className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${darkMode ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Alterar Senha</h2>
            <p className="text-[12px] text-muted-foreground">Atualize sua senha de acesso</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {changingPassword ? "Alterando..." : "Alterar Senha"}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="card-elevated p-5 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Informações da Conta</h2>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium text-foreground">Nome:</span>{" "}
            <span className="text-muted-foreground">{profile?.full_name || "—"}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">E-mail:</span>{" "}
            <span className="text-muted-foreground">{user?.email || "—"}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">ID:</span>{" "}
            <span className="text-muted-foreground">{user?.id || "—"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
