import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Trash2, Image as ImageIcon, Check, ChevronRight, ChevronLeft, User, Building2, Tag, Hash, FileText, Paperclip, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingApprovalTickets } from "@/hooks/usePendingApprovalTickets";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildStorageFileName, createPendingFile, getAttachmentDisplayName, getClipboardImageFiles, revokePendingFiles } from "@/lib/attachments";
import { dispatchWebhookEvent } from "@/hooks/useWebhooks";
import { useMySector } from "@/hooks/useMySector";

interface Props {
  onClose: () => void;
}

interface PendingFile {
  file: File;
  preview: string;
}

const STEPS = [
  { key: "dados", eyebrow: "Etapa 1", title: "Seus dados" },
  { key: "chamado", eyebrow: "Etapa 2", title: "Descreva o chamado" },
  { key: "confirmacao", eyebrow: "Etapa 3", title: "Revisão e confirmação" },
] as const;

function formatTicketNumber(n: number | null) {
  if (n == null) return "—";
  return String(n).padStart(5, "0");
}

export default function NewTicketWizardModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const { orgs } = useUserOrganizations();
  const activeOrg = orgs.find((o) => o.id === profile?.organization_id);
  const { data: mySector } = useMySector();
  const sectorName = mySector?.name || "TI";
  const queryClient = useQueryClient();
  const { refetch: refetchPendingApproval } = usePendingApprovalTickets();

  const [step, setStep] = useState(0);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [reservingNumber, setReservingNumber] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<PendingFile[]>([]);

  useEffect(() => { pendingFilesRef.current = pendingFiles; }, [pendingFiles]);
  useEffect(() => () => revokePendingFiles(pendingFilesRef.current), []);

  // Reserve number once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("reserve_ticket_number");
      if (cancelled) return;
      if (error) {
        console.error("Erro reservando número do chamado", error);
        toast.error("Não foi possível reservar número do chamado.");
      } else {
        setTicketNumber(data as unknown as number);
      }
      setReservingNumber(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).map(createPendingFile);
    setPendingFiles((prev) => [...prev, ...arr]);
  };
  const removeFile = (i: number) => {
    setPendingFiles((prev) => {
      const removed = prev[i];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs = getClipboardImageFiles(items);
    if (imgs.length) { addFiles(imgs); e.preventDefault(); }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const canAdvanceStep2 = title.trim().length > 0 && description.trim().length > 0;

  const goNext = () => setStep((s) => Math.min(2, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleConfirm = async () => {
    if (!user) return;
    // Safety gate again server-side
    const { data: pending } = await refetchPendingApproval();
    if ((pending?.length ?? 0) > 0) {
      toast.error(`Você possui ${pending!.length} chamado(s) aguardando aprovação.`);
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      const insertPayload: any = {
        title: title.trim(),
        description: description.trim(),
        priority: "Média",
        type: "Software",
        sector: "TI",
        status: "Aberto",
        created_by: user.id,
        organization_id: profile?.organization_id ?? null,
        ticket_number: ticketNumber,
      };
      const { data: ticketData, error } = await supabase
        .from("tickets")
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      const ticketId = ticketData.id;
      const failed: string[] = [];
      for (const pf of pendingFiles) {
        const fileName = buildStorageFileName(pf.file);
        const path = `tickets/${ticketId}/${fileName}`;
        const displayName = getAttachmentDisplayName(pf.file);
        const { data: up, error: upErr } = await supabase.storage
          .from("attachments")
          .upload(path, pf.file, { cacheControl: "3600", upsert: false, contentType: pf.file.type || undefined });
        if (upErr) { failed.push(displayName); continue; }
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(up.path);
        const { error: attErr } = await supabase.from("ticket_attachments").insert({
          ticket_id: ticketId,
          file_url: urlData.publicUrl,
          file_name: displayName,
        });
        if (attErr) failed.push(displayName);
      }

      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      dispatchWebhookEvent(ticketId, "ticket_created");

      const numberLabel = formatTicketNumber(ticketNumber);
      if (failed.length) {
        toast.warning(`Chamado Nº ${numberLabel} criado, mas ${failed.length} anexo(s) falharam.`);
      } else {
        toast.success(`Chamado Nº ${numberLabel} aberto com sucesso!`);
      }
      revokePendingFiles(pendingFilesRef.current);
      pendingFilesRef.current = [];
      onClose();
    } catch (err: any) {
      console.error("Erro ao criar chamado", err);
      toast.error("Erro ao criar chamado: " + (err?.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberLabel = formatTicketNumber(ticketNumber);

  const progressPct = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div
        onPasteCapture={handlePaste}
        className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[92vh] overflow-auto animate-fade-in"
      >
        {/* Header w/ stepper */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Abertura de chamado
              </p>
              <h2 className="text-lg font-semibold text-foreground mt-0.5">
                {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")} · {STEPS[step].title}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <div key={s.key} className="flex-1 flex items-center gap-2 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 transition-colors ${
                      done
                        ? "bg-primary text-primary-foreground border-primary"
                        : current
                        ? "bg-primary/10 text-primary border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.eyebrow}</p>
                    <p className={`text-xs font-medium truncate ${current || done ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                  </div>
                  {i < STEPS.length - 1 && <div className={`hidden sm:block flex-1 h-px ${done ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {STEPS[step].eyebrow}
          </p>
          <h3 className="text-2xl font-semibold text-foreground mt-1 mb-5">
            {step === 0 && "Confirme seus dados"}
            {step === 1 && "Sobre o que é o chamado?"}
            {step === 2 && "Revise e confirme a abertura"}
          </h3>

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoField icon={<User className="h-4 w-4" />} label="Solicitante" value={profile?.full_name || "—"} />
                <InfoField icon={<Building2 className="h-4 w-4" />} label="Organização" value={activeOrg?.name || "—"} />
                <InfoField icon={<Tag className="h-4 w-4" />} label="Setor" value="TI" fixedBadge />
                <InfoField icon={<User className="h-4 w-4" />} label="E-mail" value={profile?.email || user?.email || "—"} />
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Hash className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">TICKET DE NÚMERO:</p>
                  <p className="text-sm text-muted-foreground">{"\n"}</p>
                  <p className="text-3xl font-bold text-foreground tabular-nums">
                    Nº {reservingNumber ? "…" : numberLabel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Título *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resumo do problema"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Descrição *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Descreva detalhadamente o problema ou solicitação..."
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Anexos (opcional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mt-1.5 border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                    dragOver ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
                  }`}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground text-center">
                    Clique para selecionar, arraste ou cole uma imagem (Ctrl+V)
                  </span>
                </div>

                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {pendingFiles.map((pf, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                        {pf.preview ? (
                          <img src={pf.preview} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs text-foreground flex-1 truncate">{pf.file.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
                <ReviewRow icon={<Building2 className="h-4 w-4" />} label="Organização" value={activeOrg?.name || "—"} />
                <ReviewRow icon={<Tag className="h-4 w-4" />} label="Setor" value="TI" />
                <ReviewRow icon={<User className="h-4 w-4" />} label="Solicitante" value={profile?.full_name || "—"} />
                <ReviewRow icon={<FileText className="h-4 w-4" />} label="Título" value={title || "—"} />
                <ReviewRow icon={<FileText className="h-4 w-4" />} label="Descrição" value={description || "—"} multiline />
                <ReviewRow icon={<Paperclip className="h-4 w-4" />} label="Anexos" value={`${pendingFiles.length} arquivo(s)`} />
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Confirmação</p>
                  <p className="text-sm text-foreground">
                    Ao confirmar, seu chamado será registrado como{" "}
                    <span className="font-bold tabular-nums">Nº {numberLabel}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground tabular-nums">
            Nº <span className="font-semibold text-foreground">{reservingNumber ? "…" : numberLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            {step < 2 ? (
              <button
                onClick={goNext}
                disabled={reservingNumber || (step === 1 && !canAdvanceStep2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Avançar <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || !canAdvanceStep2 || reservingNumber}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? "Enviando..." : `Confirmar abertura · Nº ${numberLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ icon, label, value, fixedBadge }: { icon: React.ReactNode; label: string; value: string; fixedBadge?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
        {fixedBadge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
            Fixo
          </span>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ icon, label, value, multiline }: { icon: React.ReactNode; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm text-foreground ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value}</p>
      </div>
    </div>
  );
}
