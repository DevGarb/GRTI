// Helpers para persistir/ler a organização ativa em URL (?org=slug) e localStorage.
// URL é fonte da verdade quando presente; localStorage é fallback entre sessões.

const STORAGE_KEY = "activeOrgSlug";
export const ORG_QUERY_PARAM = "org";

export function readOrgSlugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get(ORG_QUERY_PARAM);
  return slug && slug.trim() ? slug.trim() : null;
}

export function readStoredOrgSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredOrgSlug(slug: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (slug) window.localStorage.setItem(STORAGE_KEY, slug);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Preferência: URL > localStorage. */
export function resolveActiveOrgSlug(): string | null {
  return readOrgSlugFromUrl() ?? readStoredOrgSlug();
}

/** Atualiza (ou remove) o parâmetro `?org=` sem recarregar. */
export function writeOrgSlugToUrl(slug: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(ORG_QUERY_PARAM, slug);
  else url.searchParams.delete(ORG_QUERY_PARAM);
  window.history.replaceState({}, "", url.toString());
}

/** Persiste a org selecionada nos dois canais (URL + storage). */
export function persistActiveOrgSlug(slug: string | null) {
  writeStoredOrgSlug(slug);
  writeOrgSlugToUrl(slug);
}
