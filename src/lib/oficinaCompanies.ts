// Empresas dos módulos operacionais.
// Cada empresa pode ser marcada para aparecer em Oficina, Manutenção Predial e/ou Entregas.
export function filterOficinaCompanies<T extends { is_workshop?: boolean | null }>(companies: T[]): T[] {
  return companies.filter(c => !!c.is_workshop);
}

export function filterEntregasCompanies<T extends { is_delivery?: boolean | null }>(companies: T[]): T[] {
  return companies.filter(c => c.is_delivery !== false);
}

export function filterManutencaoCompanies<T extends { is_maintenance?: boolean | null }>(companies: T[]): T[] {
  return companies.filter(c => c.is_maintenance !== false);
}
