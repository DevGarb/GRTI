import { useAuth } from "@/contexts/AuthContext";

/**
 * Fonte única para o ID da organização ativa no cliente.
 *
 * Toda query/mutation que precise ficar isolada por org deve usar este hook
 * (ou receber o valor via props). A RLS já garante isolamento no banco —
 * este hook garante que o front nunca vaze cache/dados entre organizações
 * quando o usuário troca de contexto.
 *
 * Retorna `null` para super_admin em modo "todas organizações" e enquanto o
 * profile ainda está carregando.
 */
export function useActiveOrgId(): string | null {
  const { profile } = useAuth();
  return profile?.organization_id ?? null;
}
