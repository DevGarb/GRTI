// Empresas permitidas apenas no módulo Oficina.
// Entregas e Manutenção Predial continuam usando todas as empresas cadastradas.
export const OFICINA_COMPANY_NAMES = ["Resolve", "CearaGPS", "Motoloc"];

export function filterOficinaCompanies<T extends { name: string }>(companies: T[]): T[] {
  return companies.filter(c =>
    OFICINA_COMPANY_NAMES.some(n => n.toLowerCase() === (c.name || "").trim().toLowerCase())
  );
}
