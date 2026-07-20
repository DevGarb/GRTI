import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react";
import { useChkExecution, useSaveChkExecutionItem, useCompleteChkExecution, uploadChkPhoto, getChkPhotoUrl } from "@/hooks/useChecklists";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ChkExecutar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: exec, isLoading } = useChkExecution(id);
  const saveItem = useSaveChkExecutionItem();
  const complete = useCompleteChkExecution();

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !exec) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const readonly = exec.status === "concluida";
  const doneCount = exec.items.filter((it: any) => it.done).length;
  const total = exec.items.length;
  const canComplete = !readonly && exec.items.every((it: any) => {
    if (!it.done) return false;
    if (it.chk_template_items?.requires_photo && !it.photo_path) return false;
    return true;
  });

  const handlePhoto = async (item: any, file: File) => {
    if (!profile?.organization_id) return;
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

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      <div>
        <h1 className="text-2xl font-bold">{exec.chk_templates?.title}</h1>
        <p className="text-sm text-muted-foreground">
          {exec.chk_companies?.name} · {exec.target_date} · {doneCount}/{total} itens
          {exec.score !== null && ` · Score: ${exec.score}%`}
        </p>
      </div>

      {exec.chk_templates?.description && (
        <div className="card-elevated p-3 text-sm text-muted-foreground">{exec.chk_templates.description}</div>
      )}

      <div className="space-y-3">
        {exec.items.map((it: any, idx: number) => {
          const ti = it.chk_template_items;
          const weightLabel = ti?.weight === 3 ? "Imprescindível" : ti?.weight === 2 ? "Importante" : "Comum";
          const weightColor = ti?.weight === 3 ? "bg-red-100 text-red-700" : ti?.weight === 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";
          return (
            <div key={it.id} className={`card-elevated p-4 space-y-3 ${it.done ? "border-primary/30" : ""}`}>
              <div className="flex items-start gap-3">
                <button
                  disabled={readonly}
                  onClick={() => saveItem.mutate({ id: it.id, done: !it.done })}
                  className={`h-6 w-6 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${it.done ? "bg-primary border-primary text-primary-foreground" : "border-input hover:border-primary"}`}
                >
                  {it.done && <Check className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <p className="font-medium">{idx + 1}. {ti?.title}</p>
                  {ti?.observation && <p className="text-xs text-muted-foreground mt-0.5">{ti.observation}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${weightColor}`}>{weightLabel}</span>
              </div>

              <textarea
                disabled={readonly}
                placeholder="Observação (opcional)"
                defaultValue={it.observation || ""}
                onBlur={(e) => e.target.value !== (it.observation || "") && saveItem.mutate({ id: it.id, observation: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm disabled:opacity-60"
              />

              <div className="flex items-center gap-3">
                {photoUrls[it.id] ? (
                  <a href={photoUrls[it.id]} target="_blank" rel="noreferrer">
                    <img src={photoUrls[it.id]} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                  </a>
                ) : (
                  ti?.requires_photo && <span className="text-xs text-red-600">Foto obrigatória</span>
                )}
                {!readonly && (
                  <label className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1.5 ${failedIds.has(it.id) ? "border-red-500 text-red-600 hover:bg-red-50" : "border-input hover:bg-muted"}`}>
                    {uploadingId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {failedIds.has(it.id) ? "Falha no envio, toque pra tentar de novo" : it.photo_path ? "Trocar foto" : "Anexar foto"}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhoto(it, e.target.files[0])} />
                  </label>
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
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow-lg hover:opacity-90 disabled:opacity-50"
          >
            {canComplete ? "Concluir checklist" : `Faltam ${total - doneCount} item(ns)`}
          </button>
        </div>
      )}
    </div>
  );
}
