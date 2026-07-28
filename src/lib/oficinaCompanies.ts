// Empresas do módulo Oficina.
// Entregas e Manutenção Predial usam todas as empresas cadastradas;
// a Oficina usa apenas as marcadas como empresa da oficina (is_workshop).
export function filterOficinaCompanies<T extends { is_workshop?: boolean | null }>(companies: T[]): T[] {
  return companies.filter(c => !!c.is_workshop);
}
