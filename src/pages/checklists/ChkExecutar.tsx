import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Loader2, Ban, RotateCcw } from "lucide-react";
import { useChkExecution, useSaveChkExecutionItem, useCompleteChkExecution, useReopenChkExecution, uploadChkPhoto, getChkPhotoUrl } from "@/hooks/useChecklists";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/dateFormat";
import { ChkBadge } from "@/components/checklists/ChkUI";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/fancybox.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export default function ChkExecutar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const { data: exec, isLoading } = useChkExecution(id);
  const saveItem = useSaveChkExecutionItem();
  const complete = useCompleteChkExecution();
  const reopen = useReopenChkExecution();

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [observations, setObservations] = useState<Record<string, string>>({});
  const savedRef = useRef<Record<string, string>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!exec?.items) return;
    let cancelled = false;
    (async () => {
      const items = exec.items.filter((it: any) => it.photo_path);
      const entries = await Promise.all(
        items.map(async (it: any) => [it.id, await getChkPhotoUrl(it.photo_path)] as const)
      );
      if (cancelled) return;
      setPhotoUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [exec]);

  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach((u) => URL.revokeObjectURL(u));
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Semeia observations locais com o que veio do servidor (sem sobrescrever edições em andamento).
  useEffect(() => {
    if (!exec?.items) return;
    setObservations((prev) => {
      const next = { ...prev };
      for (const it of exec.items) {
        const server = it.observation || "";
        if (savedRef.current[it.id] === undefined) {
          next[it.id] = server;
          savedRef.current[it.id] = server;
        }
      }
      return next;
    });
  }, [exec]);

  const flushObservation = (itemId: string) => {
    const val = observations[itemId] ?? "";
    if (savedRef.current[itemId] === val) return;
    savedRef.current[itemId] = val;
    saveItem.mutate(
      { id: itemId, observation: val },
      { onSuccess: () => setLastSavedAt(new Date()) },
    );
  };

  const handleObservationChange = (itemId: string, val: string) => {
    setObservations((prev) => ({ ...prev, [itemId]: val }));
    if (timersRef.current[itemId]) clearTimeout(timersRef.current[itemId]);
    timersRef.current[itemId] = setTimeout(() => flushObservation(itemId), 800);
  };

  if (isLoading || !exec) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const readonly = exec.status === "concluida";
  const resolvedCount = exec.items.filter((it: any) => it.done || it.not_applicable).length;
  const doneCount = exec.items.filter((it: any) => it.done).length;
  const total = exec.items.length;
  const canComplete = !readonly && exec.items.every((it: any) => {
    if (it.not_applicable) return true;
    if (!it.done) return false;
    if (it.chk_template_items?.requires_photo && !it.photo_path) return false;
    return true;
  });

  const handlePhoto = async (item: any, file: File) => {
    if (!profile?.organization_id) return;
    // Preview local imediato
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviews((prev) => {
      if (prev[item.id]) URL.revokeObjectURL(prev[item.id]);
      return { ...prev, [item.id]: previewUrl };
    });
    setUploadingId(item.id);
    try {
      const path = await uploadChkPhoto(profile.organization_id, exec.id, item.id, file);
      await saveItem.mutateAsync({ id: item.id, photo_path: path });
      const url = await getChkPhotoUrl(path);
      setPhotoUrls((prev) => ({ ...prev, [item.id]: url }));
      setFailedIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
      setFailedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    } finally {
      setUploadingId(null);
    }
  };

  const progress = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const pending = total - resolvedCount;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="text-sm text-[hsl(var(--chk-text-dim))] hover:text-foreground flex items-center gap-1.5 font-medium transition-colors"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      <div className="sticky top-12 z-20 -mx-1 px-1 pt-1 pb-2 bg-[hsl(var(--chk-surface-2))]/92 backdrop-blur-sm">
        <div className="card-elevated p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{exec.chk_templates?.title}</h1>
              <p className="text-sm text-[hsl(var(--chk-text-dim))] mt-1">
                {exec.chk_companies?.name} · {formatDateBR(exec.target_date)} · {resolvedCount}/{total} itens
                {exec.score !== null && ` · Score: ${exec.score}%`}
              </p>
            </div>
            <ChkBadge tone={readonly ? "ok" : "info"}>{readonly ? "Concluída" : "Em execução"}</ChkBadge>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--chk-text-dim))] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Progresso</span>
              <div className="flex items-center gap-2">
                {!readonly && lastSavedAt && (
                  <span className="text-[11px] text-[hsl(var(--chk-ok))]">
                    Rascunho salvo {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="font-bold text-foreground tabular-nums">{progress}%</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-[hsl(var(--chk-surface-3))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--chk-primary))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {exec.chk_templates?.description && (
        <div className="card-elevated p-4 text-sm text-[hsl(var(--chk-text-dim))] leading-relaxed">{exec.chk_templates.description}</div>
      )}

      <div className="space-y-3">
        {exec.items.map((it: any, idx: number) => {
          const ti = it.chk_template_items;
          const weightLabel = ti?.weight === 3 ? "Imprescindível" : ti?.weight === 2 ? "Importante" : "Comum";
          const weightTone = ti?.weight === 3 ? "danger" : ti?.weight === 2 ? "warn" : "neutral";
          const na = it.not_applicable;
          const cardBorder = na
            ? "opacity-70 bg-[hsl(var(--chk-surface-2))]"
            : it.done
            ? "ring-1 ring-[hsl(var(--chk-primary)/0.28)]"
            : "";
          return (
            <div key={it.id} className={`card-elevated p-4 space-y-3 transition-all duration-200 ${cardBorder}`}>
              <div className="flex items-start gap-3">
                <button
                  disabled={readonly || na}
                  onClick={() => saveItem.mutate({ id: it.id, done: !it.done })}
                  aria-label={it.done ? "Desmarcar item" : "Marcar item como feito"}
                  className={`h-6 w-6 rounded-md border-2 shrink-0 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${it.done && !na ? "bg-[hsl(var(--chk-primary))] border-[hsl(var(--chk-primary))] text-primary-foreground scale-105" : "border-input hover:border-[hsl(var(--chk-primary))]"}`}
                >
                  {it.done && !na && <Check className="h-4 w-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-snug ${na ? "line-through text-[hsl(var(--chk-text-dim))]" : ""}`}>{idx + 1}. {ti?.title}</p>
                  {ti?.observation && <p className="text-xs text-[hsl(var(--chk-text-dim))] mt-1 leading-relaxed">{ti.observation}</p>}
                </div>
                <ChkBadge tone={weightTone as any}>{weightLabel}</ChkBadge>
              </div>


              <textarea
                disabled={readonly}
                placeholder="Observação (opcional)"
                value={observations[it.id] ?? ""}
                onChange={(e) => handleObservationChange(it.id, e.target.value)}
                onBlur={() => {
                  if (timersRef.current[it.id]) clearTimeout(timersRef.current[it.id]);
                  flushObservation(it.id);
                }}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm disabled:opacity-60"
              />

              <div className="flex items-center gap-3 flex-wrap">
                {!na && (() => {
                  const displayUrl = localPreviews[it.id] || photoUrls[it.id];
                  if (displayUrl) {
                    return (
                      <a href={displayUrl} target="_blank" rel="noreferrer" className="relative">
                        <img src={displayUrl} alt="" className="h-16 w-16 object-cover rounded-xl border border-[hsl(var(--chk-border))]" />
                        {uploadingId === it.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        )}
                      </a>
                    );
                  }
                  return ti?.requires_photo && <span className="chk-badge chk-badge-danger">Foto obrigatória</span>;
                })()}
                {!readonly && !na && (
                  <label className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1.5 ${failedIds.has(it.id) ? "border-red-500 text-red-600 hover:bg-red-50" : "border-[hsl(var(--chk-border))] hover:bg-[hsl(var(--chk-surface-3))]"}`}>
                    {uploadingId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {failedIds.has(it.id) ? "Falha no envio, toque pra tentar de novo" : (it.photo_path || localPreviews[it.id]) ? "Trocar foto" : "Anexar foto"}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhoto(it, e.target.files[0])} />
                  </label>
                )}
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => saveItem.mutate({ id: it.id, not_applicable: !na })}
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ml-auto ${na ? "bg-muted-foreground/10 border-muted-foreground/40 text-foreground" : "border-[hsl(var(--chk-border))] hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]"}`}
                    title="Marcar como não aplicável"
                  >
                    <Ban className="h-3.5 w-3.5" /> {na ? "N/A ativado" : "N/A"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!readonly && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={() => complete.mutate(exec.id, { onSuccess: () => navigate(-1) })}
            disabled={!canComplete || complete.isPending}
            className="px-6 py-3 rounded-xl bg-[hsl(var(--chk-primary))] text-primary-foreground font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-50"
          >
            {canComplete ? "Concluir checklist" : `Faltam ${pending} item(ns)`}
          </button>
        </div>
      )}
      {readonly && isAdmin && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={() => reopen.mutate(exec.id)}
            disabled={reopen.isPending}
            className="px-6 py-3 rounded-xl bg-[hsl(var(--chk-warn))] text-primary-foreground font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Reabrir checklist
          </button>
        </div>
      )}
    </div>

  );
}
