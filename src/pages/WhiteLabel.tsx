import { useState, useEffect, useRef } from "react";
import { Palette, Building2, Save, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function WhiteLabel() {
  const { profile, hasRole } = useAuth();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0F4C4C");
  const [secondaryColor, setSecondaryColor] = useState("#F5F7F9");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoSize, setLogoSize] = useState(36);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrg(data);
            setName(data.name);
            setSlug(data.slug);
            setPrimaryColor(data.primary_color || "#0F4C4C");
            setSecondaryColor(data.secondary_color || "#F5F7F9");
            setLogoUrl(data.logo_url || "");
            setFaviconUrl((data as any).favicon_url || "");
          }
        });
    }
  }, [profile?.organization_id]);

  const handleUploadLogo = async (file: File) => {
    if (!org) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${org.id}/logo.${ext}`;

    // Remove old logo if exists
    await supabase.storage.from("org-logos").remove([filePath]);

    const { error } = await supabase.storage
      .from("org-logos")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast.error("Erro ao fazer upload: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("org-logos")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    setLogoUrl(publicUrl);
    
    // Save to org immediately
    await supabase
      .from("organizations")
      .update({ logo_url: publicUrl })
      .eq("id", org.id);

    toast.success("Logo enviado com sucesso!");
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!org) return;
    setLogoUrl("");
    await supabase
      .from("organizations")
      .update({ logo_url: null })
      .eq("id", org.id);
    toast.success("Logo removido!");
  };

  const handleUploadFavicon = async (file: File) => {
    if (!org) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("O favicon deve ter no máximo 1MB.");
      return;
    }

    setUploadingFavicon(true);
    const ext = file.name.split(".").pop();
    const filePath = `${org.id}/favicon.${ext}`;

    await supabase.storage.from("org-logos").remove([filePath]);

    const { error } = await supabase.storage
      .from("org-logos")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast.error("Erro ao fazer upload: " + error.message);
      setUploadingFavicon(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("org-logos")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl + "?t=" + Date.now();
    setFaviconUrl(publicUrl);

    await supabase
      .from("organizations")
      .update({ favicon_url: publicUrl } as any)
      .eq("id", org.id);

    // Apply immediately
    applyFavicon(publicUrl);

    toast.success("Favicon enviado com sucesso!");
    setUploadingFavicon(false);
  };

  const handleRemoveFavicon = async () => {
    if (!org) return;
    setFaviconUrl("");
    await supabase
      .from("organizations")
      .update({ favicon_url: null } as any)
      .eq("id", org.id);
    applyFavicon("/favicon.ico");
    toast.success("Favicon removido!");
  };

  const applyFavicon = (url: string) => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  };

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
      } as any)
      .eq("id", org.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações salvas! Recarregue para ver as mudanças.");
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios.");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar organização: " + error.message);
    } else if (data) {
      await supabase
        .from("profiles")
        .update({ organization_id: data.id })
        .eq("user_id", profile!.user_id);
      setOrg(data);
      toast.success("Organização criada!");
    }
    setCreating(false);
  };

  const isAdmin = hasRole("admin");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">White Label</h1>
          <p className="text-sm text-muted-foreground">Personalize a identidade visual da sua empresa</p>
        </div>
      </div>

      {!org ? (
        <div className="card-elevated p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Nenhuma organização vinculada. Crie uma para personalizar o sistema.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground">Nome da Empresa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minha Empresa"
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Slug (URL) *</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="minha-empresa"
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? "Criando..." : "Criar Organização"}
          </button>
        </div>
      ) : (
        <>
          <div className="card-elevated p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Identidade Visual</h2>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Nome da Empresa</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="text-sm font-medium text-foreground">Logo da Empresa</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Se definido, substitui o nome no menu lateral. Máx. 2MB.
              </p>
              
              {logoUrl ? (
                <div className="flex items-start gap-4">
                  <div className="border border-border rounded-lg p-4 bg-muted inline-flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={{ height: `${logoSize}px` }}
                      className="object-contain max-w-[180px]"
                    />
                  </div>
                  <div className="space-y-2">
                    {isAdmin && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Tamanho no sidebar ({logoSize}px)</label>
                          <input
                            type="range"
                            min="24"
                            max="64"
                            value={logoSize}
                            onChange={(e) => setLogoSize(Number(e.target.value))}
                            className="w-full mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition-colors text-foreground"
                          >
                            Trocar
                          </button>
                          <button
                            onClick={handleRemoveLogo}
                            className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <X className="h-3 w-3 inline mr-1" />
                            Remover
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors",
                    isAdmin ? "cursor-pointer hover:border-primary/50 hover:bg-muted/50" : "opacity-50"
                  )}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, SVG — Máx. 2MB</span>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadLogo(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="text-sm font-medium text-foreground">Favicon da Empresa</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Ícone exibido na aba do navegador. Recomendado: 32×32 ou 64×64px. Máx. 1MB.
              </p>
              
              {faviconUrl ? (
                <div className="flex items-center gap-4">
                  <div className="border border-border rounded-lg p-3 bg-muted inline-flex items-center justify-center">
                    <img
                      src={faviconUrl}
                      alt="Favicon"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploadingFavicon}
                        className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition-colors text-foreground"
                      >
                        Trocar
                      </button>
                      <button
                        onClick={handleRemoveFavicon}
                        className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <X className="h-3 w-3 inline mr-1" />
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => isAdmin && faviconInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-4 text-center transition-colors",
                    isAdmin ? "cursor-pointer hover:border-primary/50 hover:bg-muted/50" : "opacity-50"
                  )}
                >
                  {uploadingFavicon ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para enviar o favicon</span>
                      <span className="text-xs text-muted-foreground">PNG, ICO, SVG — Máx. 1MB</span>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*,.ico"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFavicon(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Cor Primária</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!isAdmin}
                    className="h-10 w-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!isAdmin}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Cor Secundária</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    disabled={!isAdmin}
                    className="h-10 w-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    disabled={!isAdmin}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-border rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview do Sidebar</p>
              <div className="rounded-lg p-4" style={{ backgroundColor: primaryColor }}>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={{ height: `${logoSize}px` }}
                      className="object-contain"
                    />
                  ) : (
                    <>
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "#fff" }}
                      >
                        <span className="font-bold text-[10px]" style={{ color: primaryColor }}>
                          {name.substring(0, 2).toUpperCase() || "IN"}
                        </span>
                      </div>
                      <span className="font-semibold text-sm" style={{ color: "#fff" }}>
                        {name || "Empresa"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            )}

            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Apenas administradores podem alterar estas configurações.
              </p>
            )}
          </div>

          <div className="card-elevated p-5 space-y-2">
            <h2 className="text-base font-semibold text-foreground">Informações da Organização</h2>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium text-foreground">Slug:</span>{" "}
                <span className="text-muted-foreground">{org.slug}</span>
              </p>
              <p>
                <span className="font-medium text-foreground">ID:</span>{" "}
                <span className="text-muted-foreground">{org.id}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
