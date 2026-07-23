/**
 * Formata número do chamado com 5 dígitos, zero-padded.
 * Ex: 10 → "00010". Retorna null se não houver número.
 */
export function formatTicketNumber(n: number | null | undefined): string | null {
  if (n == null) return null;
  return String(n).padStart(5, "0");
}

/**
 * Normaliza entrada de busca por número (remove zeros à esquerda e espaços).
 */
export function normalizeTicketNumberQuery(q: string): string {
  return q.trim().replace(/^0+/, "");
}
